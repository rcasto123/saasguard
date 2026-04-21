import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import { ClientSecretCredential } from "@azure/identity";
import { decrypt } from "@/lib/crypto";

export interface M365Credentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export function createM365Client(credentialsEnc: string): Client {
  const creds: M365Credentials = JSON.parse(decrypt(credentialsEnc));
  const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });
  return Client.initWithMiddleware({ authProvider });
}

export async function listM365Users(client: Client) {
  const response = await client.api("/users").select("id,displayName,mail,department").filter("accountEnabled eq true").get();
  return (response.value ?? []) as Array<{ id: string; displayName: string; mail: string; department: string | null }>;
}

export async function listOAuthPermissionGrants(client: Client) {
  const response = await client.api("/oauth2PermissionGrants").get();
  return (response.value ?? []) as Array<{ clientId: string; principalId: string; scope: string; consentType: "Principal" | "AllPrincipals" }>;
}

export async function listServicePrincipals(client: Client) {
  const response = await client.api("/servicePrincipals").select("id,displayName,homepage,appId").get();
  return (response.value ?? []) as Array<{ id: string; displayName: string; homepage: string | null; appId: string }>;
}
