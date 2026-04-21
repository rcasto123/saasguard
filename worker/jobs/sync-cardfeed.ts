import { db } from "@/lib/db";
import { getStripeCredentials, fetchStripeCharges, merchantToDomain } from "@/lib/connectors/cardfeed";
import type { ConnectorType } from "@prisma/client";

export async function handleCardFeedSync(connectorId: string, connectorType: ConnectorType) {
  const connector = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
  if (!connector.credentialsEnc) throw new Error("No credentials configured");

  if (connectorType === "stripe") {
    await syncStripe(connector.id, connector.credentialsEnc, connector.lastSyncAt);
  }

  await db.connector.update({ where: { id: connectorId }, data: { lastSyncAt: new Date(), lastSyncStatus: "success", status: "active" } });
}

async function syncStripe(connectorId: string, credentialsEnc: string, since: Date | null) {
  const { apiKey } = getStripeCredentials(credentialsEnc);
  const sinceDate = since ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const charges = await fetchStripeCharges(apiKey, sinceDate);

  for (const charge of charges) {
    const merchantName = charge.description ?? charge.billing_details.name ?? "Unknown";
    const domain = merchantToDomain(merchantName);
    let appId: string | undefined;
    if (domain) {
      const app = await db.app.findUnique({ where: { domain } });
      appId = app?.id;
    }
    let employeeId: string | undefined;
    if (charge.billing_details.email) {
      const user = await db.user.findUnique({ where: { email: charge.billing_details.email } });
      employeeId = user?.id;
    }
    await db.spendRecord.create({
      data: { appId: appId ?? null, amount: charge.amount / 100, currency: charge.currency.toUpperCase(), period: new Date(charge.created * 1000), source: "stripe", merchantName, employeeId: employeeId ?? null },
    });
  }
  console.log(`[sync-cardfeed] Stripe: ${charges.length} charges ingested.`);
}
