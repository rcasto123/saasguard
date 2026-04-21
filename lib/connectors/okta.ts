import { decrypt } from "@/lib/crypto";

export interface OktaCredentials { domain: string; apiToken: string; }

export function getOktaCredentials(credentialsEnc: string): OktaCredentials {
  return JSON.parse(decrypt(credentialsEnc));
}

async function oktaGet<T>(domain: string, apiToken: string, path: string): Promise<T> {
  const response = await fetch(`https://${domain}${path}`, {
    headers: { Authorization: `SSWS ${apiToken}`, Accept: "application/json" },
  });
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("X-Rate-Limit-Reset") ?? "60") * 1000;
    throw Object.assign(new Error("Okta rate limit hit"), { retryAfter });
  }
  if (!response.ok) throw new Error(`Okta API error ${response.status}: ${path}`);
  return response.json() as Promise<T>;
}

export interface OktaApp {
  id: string;
  label: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  settings?: { app?: { url?: string } };
  _links?: { appLinks?: Array<{ href: string }> };
}

export interface OktaUser {
  id: string;
  status: string;
  profile: { email: string; firstName: string; lastName: string; department?: string };
}

export function listApps(domain: string, apiToken: string) {
  return oktaGet<OktaApp[]>(domain, apiToken, "/api/v1/apps?limit=200&filter=status+eq+%22ACTIVE%22");
}

export function listUsers(domain: string, apiToken: string) {
  return oktaGet<OktaUser[]>(domain, apiToken, "/api/v1/users?limit=200&filter=status+eq+%22ACTIVE%22");
}

export function listAppUsers(domain: string, apiToken: string, appId: string) {
  return oktaGet<Array<{ id: string; profile: { email: string } }>>(domain, apiToken, `/api/v1/apps/${appId}/users?limit=200`);
}

export function extractAppDomain(app: OktaApp): string {
  const url = app._links?.appLinks?.[0]?.href ?? app.settings?.app?.url ?? "";
  try {
    return new URL(url).hostname || `okta:${app.id}`;
  } catch {
    return `okta:${app.id}`;
  }
}
