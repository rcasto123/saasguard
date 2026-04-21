import { db } from "@/lib/db";
import { auth } from "@/auth";
import { RiskBadge } from "@/components/risk-badge";
import { AppStatusBadge } from "@/components/app-status-badge";
import { ApproveDenyButtons } from "@/components/approve-deny-buttons";
import { formatDistanceToNow } from "date-fns";

export default async function DiscoveryPage() {
  const session = await auth();
  const apps = await db.app.findMany({
    where: { status: { in: ["shadow", "review"] } },
    orderBy: [{ riskScore: "desc" }, { discoveredAt: "desc" }],
    select: {
      id: true, name: true, domain: true, status: true, riskScore: true, discoveredAt: true, discoveredBy: true,
      appUsers: { where: { isActive: true }, select: { user: { select: { email: true, department: true } }, scopes: true, lastSeen: true }, take: 3 },
      _count: { select: { appUsers: { where: { isActive: true } } } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Discovery</h1>
        <p className="text-sm text-slate-500">{apps.length} apps awaiting review</p>
      </div>
      {apps.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">No shadow apps found</p>
          <p className="text-sm mt-1">Connect Google Workspace or Microsoft 365 to start discovering apps.</p>
        </div>
      )}
      <div className="space-y-3">
        {apps.map((app) => (
          <div key={app.id} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-slate-900">{app.name}</h2>
                  <AppStatusBadge status={app.status} />
                  <RiskBadge score={app.riskScore} />
                </div>
                <p className="text-xs text-slate-500">{app.domain}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Found via {app.discoveredBy?.replace("_", " ")} · {formatDistanceToNow(app.discoveredAt, { addSuffix: true })} · {app._count.appUsers} active {app._count.appUsers === 1 ? "user" : "users"}
                </p>
                {app.appUsers.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {app.appUsers.map((au) => (
                      <span key={au.user.email} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{au.user.email}</span>
                    ))}
                    {app._count.appUsers > 3 && <span className="text-xs text-slate-400">+{app._count.appUsers - 3} more</span>}
                  </div>
                )}
              </div>
              {session?.user.role === "admin" && <ApproveDenyButtons appId={app.id} currentStatus={app.status} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
