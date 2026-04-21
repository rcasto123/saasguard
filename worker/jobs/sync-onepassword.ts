import { db } from "@/lib/db";
import { getOnePasswordCredentials, listVaults, listVaultItems, extractDomainFromItem } from "@/lib/connectors/onepassword";
import { createLogger } from "@/lib/logger";

const log = createLogger("sync-onepassword");

export async function handleOnePasswordSync(connectorId: string) {
  const connector = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
  if (!connector.credentialsEnc) throw new Error("No credentials configured");

  const { serverUrl, token } = getOnePasswordCredentials(connector.credentialsEnc);
  const config = (connector.config ?? {}) as { vaultIds?: string[] };
  const vaults = await listVaults(serverUrl, token);
  const targetVaults = config.vaultIds?.length ? vaults.filter((v) => config.vaultIds!.includes(v.id)) : vaults;

  for (const vault of targetVaults) {
    const items = await listVaultItems(serverUrl, token, vault.id);
    const loginItems = items.filter((item) => item.category === "LOGIN");

    for (const item of loginItems) {
      const domain = extractDomainFromItem(item);
      if (!domain) continue;
      await db.app.upsert({
        where: { domain },
        create: { name: item.title, domain, status: "managed", riskScore: 0, discoveredBy: "onepassword" },
        update: { name: item.title },
      });
    }
  }

  await db.connector.update({ where: { id: connectorId }, data: { lastSyncAt: new Date(), lastSyncStatus: "success", status: "active" } });
  log.info({ vaults: targetVaults.length }, "sync complete");
}
