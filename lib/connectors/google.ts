import { google } from "googleapis";
import { decrypt } from "@/lib/crypto";

export interface GoogleCredentials {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export function createGoogleAuthClient(credentialsEnc: string) {
  const creds: GoogleCredentials = JSON.parse(decrypt(credentialsEnc));
  const auth = new google.auth.OAuth2(creds.clientId, creds.clientSecret);
  auth.setCredentials({ refresh_token: creds.refreshToken });
  return auth;
}

export async function listDirectoryUsers(auth: InstanceType<typeof google.auth.OAuth2>) {
  const admin = google.admin({ version: "directory_v1", auth });
  const response = await admin.users.list({ customer: "my_customer", maxResults: 500, orderBy: "email" });
  return (response.data.users ?? []) as Array<{ primaryEmail: string; name: { fullName: string }; orgUnitPath: string }>;
}

export async function listUserTokens(auth: InstanceType<typeof google.auth.OAuth2>, userEmail: string) {
  const admin = google.admin({ version: "reports_v1", auth });
  try {
    const response = await admin.activities.list({ userKey: userEmail, applicationName: "token", eventName: "authorize", maxResults: 1000 });
    const grants: Array<{ displayText: string; clientId: string; scopes: string[]; userKey: string }> = [];
    for (const activity of response.data.items ?? []) {
      for (const event of activity.events ?? []) {
        const params = event.parameters ?? [];
        const appName = params.find((p) => p.name === "app_name")?.value ?? params.find((p) => p.name === "client_id")?.value ?? "";
        const clientId = params.find((p) => p.name === "client_id")?.value ?? "";
        const scopes = params.find((p) => p.name === "scope")?.multiValue ?? [];
        if (clientId) grants.push({ displayText: appName, clientId, scopes, userKey: userEmail });
      }
    }
    return grants;
  } catch {
    return [];
  }
}

export function extractDomainFromUrl(input: string): string | null {
  if (!input) return null;
  try {
    const url = input.includes("://") ? new URL(input) : new URL(`https://${input}`);
    const host = url.hostname;
    if (!host.includes(".")) return null;
    return host;
  } catch {
    return null;
  }
}
