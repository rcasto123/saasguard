import type { ConnectorType, ConnectorStatus, SyncStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

const CONNECTOR_META: Record<ConnectorType, { label: string; description: string }> = {
  google_workspace: { label: "Google Workspace", description: "OAuth app grants via Admin SDK" },
  microsoft_365: { label: "Microsoft 365", description: "OAuth grants via Microsoft Graph API" },
  okta: { label: "Okta", description: "SSO app assignments and user directory" },
  onepassword: { label: "1Password", description: "Shared vault items as managed apps" },
  stripe: { label: "Stripe", description: "Card charges as SaaS spend records" },
  brex: { label: "Brex", description: "Corporate card transactions" },
  ramp: { label: "Ramp", description: "Corporate card transactions" },
  csv: { label: "CSV Upload", description: "Manual card transaction import" },
};

const STATUS_COLOR: Record<ConnectorStatus, string> = {
  active: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
  disconnected: "bg-slate-100 text-slate-500",
  pending: "bg-yellow-100 text-yellow-700",
};

type ConnectorRow = { id: string; type: ConnectorType; status: ConnectorStatus; lastSyncAt: string | null; lastSyncStatus: SyncStatus | null };

export function ConnectorCard({ connector }: { connector: ConnectorRow }) {
  const meta = CONNECTOR_META[connector.type];
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div><h3 className="font-semibold text-slate-900">{meta.label}</h3><p className="text-xs text-slate-400">{meta.description}</p></div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[connector.status]}`}>{connector.status}</span>
      </div>
      {connector.lastSyncAt && (
        <p className="text-xs text-slate-400 mt-2">
          Last synced {formatDistanceToNow(new Date(connector.lastSyncAt), { addSuffix: true })}
          {connector.lastSyncStatus === "failed" && " — sync failed"}
        </p>
      )}
    </div>
  );
}
