import { db } from "@/lib/db";
import { getStripeCredentials, fetchStripeCharges, merchantToDomain } from "@/lib/connectors/cardfeed";
import type { ConnectorType } from "@prisma/client";
import { createLogger } from "@/lib/logger";

const log = createLogger("sync-cardfeed");

export async function handleCardFeedSync(connectorId: string, connectorType: ConnectorType) {
  const connector = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
  if (!connector.credentialsEnc) throw new Error("No credentials configured");

  if (connectorType === "stripe") {
    await syncStripe(connector.id, connector.credentialsEnc, connector.lastSyncAt);
  } else {
    throw new Error(`Card feed connector type "${connectorType}" is not yet implemented`);
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
    await db.spendRecord.upsert({
      where: {
        source_sourceId: {
          source: "stripe" as const,
          sourceId: charge.id,
        },
      },
      create: {
        sourceId: charge.id,
        appId: appId ?? null,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        period: new Date(charge.created * 1000),
        source: "stripe",
        merchantName,
        employeeId: employeeId ?? null,
      },
      update: {
        merchantName,
        appId: appId ?? null,
      },
    });
  }
  log.info({ charges: charges.length }, "Stripe sync complete");
}
