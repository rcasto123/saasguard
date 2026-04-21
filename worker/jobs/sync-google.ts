import { db } from "@/lib/db";
import { createGoogleAuthClient, listDirectoryUsers, listUserTokens, extractDomainFromUrl } from "@/lib/connectors/google";
import { calculateRiskScore } from "@/lib/risk";
import { createAlert } from "@/lib/alerts";
import { RISK_SCORE_HIGH, RISK_SCORE_MEDIUM } from "@/lib/constants";
import { createLogger } from "@/lib/logger";

const log = createLogger("sync-google");

export async function handleGoogleSync(connectorId: string) {
  const connector = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
  if (!connector.credentialsEnc) throw new Error("No credentials configured");

  await db.connector.update({ where: { id: connectorId }, data: { status: "active" } });

  const auth = createGoogleAuthClient(connector.credentialsEnc);
  const users = await listDirectoryUsers(auth);

  // --- Phase 1: Upsert all directory users and collect their grants ---
  type GrantWithUser = { domain: string; appName: string; grant: Awaited<ReturnType<typeof listUserTokens>>[number]; dbUserId: string };
  const allGrantsWithUser: GrantWithUser[] = [];
  let syncErrors = 0;

  for (const gsuiteUser of users) {
    try {
      const dbUser = await db.user.upsert({
        where: { email: gsuiteUser.primaryEmail },
        create: { email: gsuiteUser.primaryEmail, name: gsuiteUser.name?.fullName ?? gsuiteUser.primaryEmail },
        update: { name: gsuiteUser.name?.fullName ?? gsuiteUser.primaryEmail },
      });
      const grants = await listUserTokens(auth, gsuiteUser.primaryEmail);
      for (const grant of grants) {
        const domain = extractDomainFromUrl(grant.clientId) ?? `oauth:${grant.clientId}`;
        const appName = grant.displayText || domain;
        allGrantsWithUser.push({ domain, appName, grant, dbUserId: dbUser.id });
      }
    } catch (err) {
      syncErrors++;
      log.error({ email: gsuiteUser.primaryEmail, err: (err as Error).message }, "error processing user");
    }
  }

  // --- Phase 2: Bulk-fetch all apps by domain (eliminates N+1) ---
  const uniqueDomains = [...new Set(allGrantsWithUser.map((g) => g.domain))];
  const existingApps = uniqueDomains.length > 0
    ? await db.app.findMany({ where: { domain: { in: uniqueDomains } } })
    : [];
  const appByDomain = new Map(existingApps.map((a) => [a.domain, a]));

  // --- Phase 3: Create missing apps and upsert AppUser records ---
  for (const { domain, appName, grant, dbUserId } of allGrantsWithUser) {
    try {
      let app = appByDomain.get(domain);
      if (!app) {
        const riskScore = calculateRiskScore(grant.scopes);
        app = await db.app.create({
          data: { name: appName, domain, status: "shadow", riskScore, discoveredBy: "google_workspace" },
        });
        appByDomain.set(domain, app); // cache so duplicate domains don't create twice
        await createAlert({
          type: "new_shadow_app",
          severity: riskScore >= RISK_SCORE_HIGH ? "high" : riskScore >= RISK_SCORE_MEDIUM ? "medium" : "low",
          payload: { appId: app.id, appName, domain, riskScore },
        });
      }

      await db.appUser.upsert({
        where: { appId_userId: { appId: app.id, userId: dbUserId } },
        create: { appId: app.id, userId: dbUserId, grantType: "oauth", scopes: grant.scopes, isActive: true },
        update: { scopes: grant.scopes, lastSeen: new Date(), isActive: true },
      });
    } catch (err) {
      syncErrors++;
      log.error({ domain, err: (err as Error).message }, "error processing grant");
    }
  }

  await db.connector.update({
    where: { id: connectorId },
    data: { lastSyncAt: new Date(), lastSyncStatus: syncErrors === 0 ? "success" : "partial", status: "active" },
  });
  log.info({ users: users.length, grants: allGrantsWithUser.length }, "sync complete");
}
