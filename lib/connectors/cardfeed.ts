import { decrypt } from "@/lib/crypto";

export interface StripeCredentials { apiKey: string; }

export function getStripeCredentials(credentialsEnc: string): StripeCredentials {
  return JSON.parse(decrypt(credentialsEnc));
}

export async function fetchStripeCharges(apiKey: string, since: Date) {
  const response = await fetch(
    `https://api.stripe.com/v1/charges?created[gte]=${Math.floor(since.getTime() / 1000)}&limit=100`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!response.ok) throw new Error(`Stripe API error: ${response.status}`);
  const data = await response.json() as { data: Array<{ id: string; amount: number; currency: string; created: number; description: string | null; billing_details: { name: string | null; email: string | null } }> };
  return data.data;
}

const MERCHANT_DOMAIN_MAP: Record<string, string> = {
  github: "github.com",
  figma: "figma.com",
  notion: "notion.so",
  linear: "linear.app",
  slack: "slack.com",
  zoom: "zoom.us",
  salesforce: "salesforce.com",
  hubspot: "hubspot.com",
  atlassian: "atlassian.com",
  jira: "atlassian.com",
  dropbox: "dropbox.com",
  loom: "loom.com",
  miro: "miro.com",
  airtable: "airtable.com",
  intercom: "intercom.com",
  zendesk: "zendesk.com",
  datadog: "datadoghq.com",
  pagerduty: "pagerduty.com",
  retool: "retool.com",
};

export function merchantToDomain(merchantName: string): string | null {
  const lower = merchantName.toLowerCase();
  for (const [key, domain] of Object.entries(MERCHANT_DOMAIN_MAP)) {
    if (lower.includes(key)) return domain;
  }
  return null;
}

export function parseCSVTransactions(csv: string): Array<{ date: Date; merchantName: string; amount: number; currency: string; cardholderEmail: string | null }> {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const get = (key: string) => cols[headers.indexOf(key)] ?? "";
    const email = get("cardholder email");
    return {
      date: new Date(get("date")),
      merchantName: get("merchant"),
      amount: parseFloat(get("amount")),
      currency: get("currency") || "USD",
      cardholderEmail: email || null,
    };
  });
}
