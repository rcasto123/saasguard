import { db } from "@/lib/db";
import { createM365Client, listM365Users, listOAuthPermissionGrants, listServicePrincipals } from "@/lib/connectors/m365";
import { calculateRiskScore } from "@/lib/risk";
import { createAlert } from "@/lib/alerts";
import { extractDomainFromUrl } from "@/lib/connectors/google";
import { RISK_SCORE_HIGH, RISK_SCORE_MEDIUM } from "@/lib/constants";

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
  const userById = new Map(m365Users.map((u) => [u.id, u]));

  for (const m365User of m365Users) {
    if (!m365User.mail) continue;
    await db.user.upsert({
      where: { email: m365User.mail },
      create: { email: m365User.mail, name: m365User.displayName, department: m365User.department ?? undefined },
      update: { name: m365User.displayName, department: m365User.department ?? undefined },
    });
  }

  for (const grant of grants) {
    const sp = spById.get(grant.clientId);
    if (!sp) continue;
    const domain = extractDomainFromUrl(sp.homepage ?? sp.appId) ?? `msapp:${sp.appId}`;
    const scopes = grant.scope.split(" ").filter(Boolean);
    const existingApp = await db.app.findUnique({ where: { domain } });
    let app = existingApp;

    if (!app) {
      const riskScore = calculateRiskScore(scopes);
      app = await db.app.create({
        data: { name: sp.displayName, domain, status: "shadow", riskScore, discoveredBy: "microsoft_365" },
      });
      await createAlert({
        type: "new_shadow_app",
        severity: riskScore >= RISK_SCORE_HIGH ? "high" : riskScore >= RISK_SCORE_MEDIUM ? "medium" : "low",
        payload: { appId: app.id, appName: sp.displayName, domain, riskScore },
      });
    }

    if (grant.consentType === "Principal") {
      const m365User = userById.get(grant.principalId);
      if (!m365User?.mail) continue;
      const dbUser = await db.user.findUnique({ where: { email: m365User.mail } });
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
  console.log(`[sync-m365] Done. ${grants.length} grants processed.`);
}
