"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConnectorType } from "@prisma/client";

type FieldDef = { key: string; label: string; placeholder: string; type?: string };
const CONNECTOR_FIELDS: Record<string, FieldDef[]> = {
  google_workspace: [
    { key: "clientId", label: "OAuth Client ID", placeholder: "1234567890-abc.apps.googleusercontent.com" },
    { key: "clientSecret", label: "OAuth Client Secret", placeholder: "GOCSPX-..." },
    { key: "refreshToken", label: "Refresh Token", placeholder: "1//0g...", type: "password" },
  ],
  microsoft_365: [
    { key: "tenantId", label: "Tenant ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
    { key: "clientId", label: "Application (client) ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
    { key: "clientSecret", label: "Client Secret", placeholder: "~abc...", type: "password" },
  ],
  okta: [
    { key: "domain", label: "Okta Domain", placeholder: "yourcompany.okta.com" },
    { key: "apiToken", label: "API Token", placeholder: "00Abc...", type: "password" },
  ],
  onepassword: [
    { key: "serverUrl", label: "Connect Server URL", placeholder: "https://my1password.example.com" },
    { key: "token", label: "Service Account Token", placeholder: "eyJ...", type: "password" },
  ],
  stripe: [{ key: "apiKey", label: "Stripe Secret Key", placeholder: "sk_live_...", type: "password" }],
  brex: [{ key: "apiKey", label: "Brex API Key", placeholder: "...", type: "password" }],
  ramp: [{ key: "apiKey", label: "Ramp API Key", placeholder: "...", type: "password" }],
  csv: [],
};

export function ConnectorForm({ connectorType }: { connectorType: ConnectorType }) {
  const router = useRouter();
  const fields = CONNECTOR_FIELDS[connectorType] ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/connectors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: connectorType, credentials: values }) });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (connectorType === "csv") return <p className="text-sm text-slate-500">CSV uploads are done from the <a href="/spend" className="text-indigo-600 hover:underline">Spend page</a>.</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {fields.map((field) => (
        <div key={field.key}>
          <Label className="text-xs">{field.label}</Label>
          <Input type={field.type ?? "text"} placeholder={field.placeholder} value={values[field.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} required className="mt-1" />
        </div>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" disabled={saving} size="sm">{saving ? "Saving..." : "Save connector"}</Button>
    </form>
  );
}
