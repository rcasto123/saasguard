"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Alert = {
  id: string;
  type: string;
  severity: "high" | "medium" | "low";
  payload: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
};

const SEVERITY_CONFIG = {
  high: { color: "bg-red-50 border-red-200", badge: "destructive" as const, icon: AlertTriangle, iconColor: "text-red-500" },
  medium: { color: "bg-amber-50 border-amber-200", badge: "secondary" as const, icon: AlertTriangle, iconColor: "text-amber-500" },
  low: { color: "bg-blue-50 border-blue-200", badge: "secondary" as const, icon: Info, iconColor: "text-blue-500" },
};

const TYPE_LABELS: Record<string, string> = {
  new_shadow_app: "New Shadow App",
  offboarding_risk: "Offboarding Risk",
  high_spend: "High Spend",
  stale_access: "Stale Access",
  connector_error: "Connector Error",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/alerts");
    if (res.ok) setAlerts(await res.json());
    setLoading(false);
  }

  async function resolve(id: string) {
    setResolving(id);
    await fetch(`/api/alerts/${id}`, { method: "PATCH" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setResolving(null);
  }

  async function resolveAll() {
    await Promise.all(alerts.map((a) => fetch(`/api/alerts/${a.id}`, { method: "PATCH" })));
    setAlerts([]);
  }

  async function revokeAccess(alertId: string, userId: string, appId: string) {
    setRevoking(alertId);
    await fetch("/api/access/revoke", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, appId }),
    });
    // Also resolve the alert after revoking
    await fetch(`/api/alerts/${alertId}`, { method: "PATCH" });
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setRevoking(null);
  }

  const high = alerts.filter((a) => a.severity === "high");
  const medium = alerts.filter((a) => a.severity === "medium");
  const low = alerts.filter((a) => a.severity === "low");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? "Loading…" : alerts.length === 0 ? "All clear — no unresolved alerts." : `${alerts.length} unresolved alert${alerts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {alerts.length > 0 && (
          <Button variant="outline" size="sm" onClick={resolveAll} className="gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Resolve all
          </Button>
        )}
      </div>

      {!loading && alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Bell className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No active alerts</p>
        </div>
      )}

      {[{ label: "High", items: high }, { label: "Medium", items: medium }, { label: "Low", items: low }]
        .filter((g) => g.items.length > 0)
        .map(({ label, items }) => (
          <div key={label}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label} ({items.length})</h2>
            <div className="space-y-2">
              {items.map((alert) => {
                const cfg = SEVERITY_CONFIG[alert.severity];
                const Icon = cfg.icon;
                const payload = alert.payload as Record<string, string>;
                return (
                  <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-lg border ${cfg.color}`}>
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-slate-900">
                          {TYPE_LABELS[alert.type] ?? alert.type}
                        </span>
                        <Badge variant={cfg.badge} className="text-xs capitalize">{alert.severity}</Badge>
                      </div>
                      {payload.message && (
                        <p className="text-sm text-slate-600">{payload.message}</p>
                      )}
                      {payload.appName && (
                        <p className="text-xs text-slate-500 mt-0.5">App: {payload.appName}</p>
                      )}
                      {payload.userEmail && (
                        <p className="text-xs text-slate-500 mt-0.5">User: {payload.userEmail}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {(alert.type === "offboarding_risk" || alert.type === "stale_access") &&
                      payload.userId && payload.appId && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="shrink-0 text-xs h-7"
                          disabled={revoking === alert.id}
                          onClick={() => revokeAccess(alert.id, payload.userId as string, payload.appId as string)}
                        >
                          {revoking === alert.id ? "…" : "Revoke Access"}
                        </Button>
                      )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-xs h-7 bg-white"
                      disabled={resolving === alert.id}
                      onClick={() => resolve(alert.id)}
                    >
                      {resolving === alert.id ? "…" : "Resolve"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
