import { db } from "@/lib/db";
import { getOktaCredentials, listApps, listUsers, listAppUsers, extractAppDomain } from "@/lib/connectors/okta";

export async function handleOktaSync(connectorId: string) {
  const connector = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
  if (!connector.credentialsEnc) throw new Error("No credentials configured");

  const { domain, apiToken } = getOktaCredentials(connector.credentialsEnc);
  const [oktaApps, oktaUsers] = await Promise.all([listApps(domain, apiToken), listUsers(domain, apiToken)]);

  const dbUserByEmail = new Map<string, string>();
  for (const oktaUser of oktaUsers) {
    const email = oktaUser.profile.email;
    if (!email) continue;
    const dbUser = await db.user.upsert({
      where: { email },
      create: { email, name: `${oktaUser.profile.firstName} ${oktaUser.profile.lastName}`.trim(), department: oktaUser.profile.department },
      update: { name: `${oktaUser.profile.firstName} ${oktaUser.profile.lastName}`.trim(), department: oktaUser.profile.department },
    });
    dbUserByEmail.set(email, dbUser.id);
  }

  for (const oktaApp of oktaApps) {
    const appDomain = extractAppDomain(oktaApp);
    const app = await db.app.upsert({
      where: { domain: appDomain },
      create: { name: oktaApp.label, domain: appDomain, status: "managed", riskScore: 0, discoveredBy: "okta" },
      update: { name: oktaApp.label, status: "managed" },
    });

    const appUsers = await listAppUsers(domain, apiToken, oktaApp.id);
    for (const appUser of appUsers) {
      const email = appUser.profile?.email;
      const userId = email ? dbUserByEmail.get(email) : undefined;
      if (!userId) continue;
      await db.appUser.upsert({
        where: { appId_userId: { appId: app.id, userId } },
        create: { appId: app.id, userId, grantType: "sso", scopes: [], isActive: true },
        update: { lastSeen: new Date(), isActive: true },
      });
    }
  }

  await db.connector.update({ where: { id: connectorId }, data: { lastSyncAt: new Date(), lastSyncStatus: "success", status: "active" } });
  console.log(`[sync-okta] Done. ${oktaApps.length} apps, ${oktaUsers.length} users processed.`);
}
