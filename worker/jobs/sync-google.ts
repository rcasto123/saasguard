import { db } from "@/lib/db";
import { createGoogleAuthClient, listDirectoryUsers, listUserTokens, extractDomainFromUrl } from "@/lib/connectors/google";
import { calculateRiskScore } from "@/lib/risk";
import { createAlert } from "@/lib/alerts";
import { RISK_SCORE_HIGH, RISK_SCORE_MEDIUM } from "@/lib/constants";

export async function handleGoogleSync(connectorId: string) {
  const connector = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
  if (!connector.credentialsEnc) throw new Error("No credentials configured");

  await db.connector.update({ where: { id: connectorId }, data: { status: "active" } });

  const auth = createGoogleAuthClient(connector.credentialsEnc);
  const users = await listDirectoryUsers(auth);
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
        const existingApp = await db.app.findUnique({ where: { domain } });
        let app = existingApp;

        if (!app) {
          const riskScore = calculateRiskScore(grant.scopes);
          app = await db.app.create({
            data: { name: appName, domain, status: "shadow", riskScore, discoveredBy: "google_workspace" },
          });
          await createAlert({
            type: "new_shadow_app",
            severity: riskScore >= RISK_SCORE_HIGH ? "high" : riskScore >= RISK_SCORE_MEDIUM ? "medium" : "low",
            payload: { appId: app.id, appName, domain, discoveredFor: gsuiteUser.primaryEmail, riskScore },
          });
        }

        await db.appUser.upsert({
          where: { appId_userId: { appId: app.id, userId: dbUser.id } },
          create: { appId: app.id, userId: dbUser.id, grantType: "oauth", scopes: grant.scopes, isActive: true },
          update: { scopes: grant.scopes, lastSeen: new Date(), isActive: true },
        });
      }
    } catch (err) {
      syncErrors++;
      console.error(`[sync-google] Error processing user ${gsuiteUser.primaryEmail}:`, (err as Error).message);
    }
  }

  await db.connector.update({
    where: { id: connectorId },
    data: { lastSyncAt: new Date(), lastSyncStatus: syncErrors === 0 ? "success" : "partial", status: "active" },
  });
  console.log(`[sync-google] Done. ${users.length} users processed.`);
}
