import { db } from "@/lib/db";
import { createM365Client, listM365Users, listOAuthPermissionGrants, listServicePrincipals } from "@/lib/connectors/m365";
import { calculateRiskScore } from "@/lib/risk";
import { createAlert } from "@/lib/alerts";
import { extractDomainFromUrl } from "@/lib/connectors/google";
import { RISK_SCORE_HIGH, RISK_SCORE_MEDIUM } from "@/lib/constants";
import { createLogger } from "@/lib/logger";

const log = createLogger("sync-m365");

export async function handleM365Sync(connectorId: string) {
  const connector = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
  if (!connector.credentialsEnc) throw new Error("No credentials configured");

  const client = createM365Client(connector.credentialsEnc);
  const [m365Users, grants, servicePrincipals] = await Promise.all([
    listM365Users(client),
    listOAuthPermissionGrants(client),
    listServicePrincipals(client),
  ]);

  const spById = new Map(servicePrincipals.map((sp) => [sp.id, sp]));

  // --- Phase 1: Upsert all directory users ---
  for (const m365User of m365Users) {
    if (!m365User.mail) continue;
    await db.user.upsert({
      where: { email: m365User.mail },
      create: { email: m365User.mail, name: m365User.displayName, department: m365User.department ?? undefined },
      update: { name: m365User.displayName, department: m365User.department ?? undefined },
    });
  }

  // --- Phase 2: Bulk-fetch DB users by email (eliminates per-grant user lookups) ---
  const m365Emails = m365Users.map((u) => u.mail).filter(Boolean) as string[];
  const dbUsers = m365Emails.length > 0
    ? await db.user.findMany({ where: { email: { in: m365Emails } }, select: { id: true, email: true } })
    : [];
  const dbUserByEmail = new Map(dbUsers.map((u) => [u.email, u]));

  // --- Phase 3: Bulk-fetch all apps by domain (eliminates per-grant app lookups) ---
  const grantDomains = grants.flatMap((grant) => {
    const sp = spById.get(grant.clientId);
    if (!sp) return [];
    return [extractDomainFromUrl(sp.homepage ?? sp.appId) ?? `msapp:${sp.appId}`];
  });
  const uniqueGrantDomains = [...new Set(grantDomains)];
  const existingApps = uniqueGrantDomains.length > 0
    ? await db.app.findMany({ where: { domain: { in: uniqueGrantDomains } } })
    : [];
  const appByDomain = new Map(existingApps.map((a) => [a.domain, a]));

  // --- Phase 4: Process grants using in-memory maps ---
  for (const grant of grants) {
    const sp = spById.get(grant.clientId);
    if (!sp) continue;
    const domain = extractDomainFromUrl(sp.homepage ?? sp.appId) ?? `msapp:${sp.appId}`;
    const scopes = grant.scope.split(" ").filter(Boolean);

    let app = appByDomain.get(domain);
    if (!app) {
      const riskScore = calculateRiskScore(scopes);
      app = await db.app.create({
        data: { name: sp.displayName, domain, status: "shadow", riskScore, discoveredBy: "microsoft_365" },
      });
      appByDomain.set(domain, app); // cache so duplicate domains don't create twice
      await createAlert({
        type: "new_shadow_app",
        severity: riskScore >= RISK_SCORE_HIGH ? "high" : riskScore >= RISK_SCORE_MEDIUM ? "medium" : "low",
        payload: { appId: app.id, appName: sp.displayName, domain, riskScore },
      });
    }

    if (grant.consentType === "Principal") {
      const m365UserForGrant = m365Users.find((u) => u.id === grant.principalId);
      if (!m365UserForGrant?.mail) continue;
      const dbUser = dbUserByEmail.get(m365UserForGrant.mail);
      if (!dbUser) continue;
      await db.appUser.upsert({
        where: { appId_userId: { appId: app.id, userId: dbUser.id } },
        create: { appId: app.id, userId: dbUser.id, grantType: "oauth", scopes, isActive: true },
        update: { scopes, lastSeen: new Date(), isActive: true },
      });
    }
  }

  await db.connector.update({
    where: { id: connectorId },
    data: { lastSyncAt: new Date(), lastSyncStatus: "success", status: "active" },
  });
  log.info({ grants: grants.length }, "sync complete");
}
