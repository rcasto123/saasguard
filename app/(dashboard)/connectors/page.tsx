import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ConnectorCard } from "@/components/connector-card";
import { ConnectorForm } from "@/components/connector-form";
import type { ConnectorType } from "@prisma/client";

const ALL_TYPES: ConnectorType[] = ["google_workspace", "microsoft_365", "okta", "onepassword", "stripe", "brex", "ramp", "csv"];

export default async function ConnectorsPage() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/dashboard");

  const connectors = await db.connector.findMany({
    select: { id: true, type: true, status: true, lastSyncAt: true, lastSyncStatus: true },
  });
  const connectedTypes = new Set(connectors.map((c) => c.type));

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold text-slate-900">Connectors</h1><p className="text-sm text-slate-500">Manage your SaaS data sources</p></div>
      {connectors.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Connected</h2>
          <div className="grid grid-cols-2 gap-3">
            {connectors.map((c) => <ConnectorCard key={c.id} connector={{ ...c, lastSyncAt: c.lastSyncAt?.toISOString() ?? null }} />)}
          </div>
        </div>
      )}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Add Connector</h2>
        <div className="space-y-3">
          {ALL_TYPES.filter((t) => !connectedTypes.has(t)).map((type) => (
            <details key={type} className="bg-white rounded-lg border border-slate-200">
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-900 list-none flex items-center justify-between">
                {type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                <span className="text-xs text-indigo-600">+ Configure</span>
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-slate-100"><ConnectorForm connectorType={type} /></div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
