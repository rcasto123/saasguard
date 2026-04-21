import { decrypt } from "@/lib/crypto";

export interface OnePasswordCredentials { serverUrl: string; token: string; }

export function getOnePasswordCredentials(credentialsEnc: string): OnePasswordCredentials {
  return JSON.parse(decrypt(credentialsEnc));
}

async function opGet<T>(serverUrl: string, token: string, path: string): Promise<T> {
  const response = await fetch(`${serverUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`1Password API error ${response.status}: ${path}`);
  return response.json() as Promise<T>;
}

export interface OpVault { id: string; name: string; description?: string; }
export interface OpItem {
  id: string;
  title: string;
  category: string;
  vault: { id: string };
  urls?: Array<{ href: string; primary?: boolean }>;
  tags?: string[];
}

export function listVaults(serverUrl: string, token: string) {
  return opGet<OpVault[]>(serverUrl, token, "/v1/vaults");
}

export function listVaultItems(serverUrl: string, token: string, vaultId: string) {
  return opGet<OpItem[]>(serverUrl, token, `/v1/vaults/${vaultId}/items`);
}

export function extractDomainFromItem(item: OpItem): string | null {
  const primaryUrl = item.urls?.find((u) => u.primary)?.href ?? item.urls?.[0]?.href;
  if (!primaryUrl) return null;
  try {
    return new URL(primaryUrl).hostname;
  } catch {
    return null;
  }
}
