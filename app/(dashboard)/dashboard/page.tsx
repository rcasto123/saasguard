import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AppStatusBadge } from "@/components/app-status-badge";
import { RiskBadge } from "@/components/risk-badge";
import { formatDistanceToNow } from "date-fns";
import type { Session } from "next-auth";

type SessionUser = Session["user"];

async function getStats(user: SessionUser) {
  const isManager = user.role === "manager" && user.department;
  const deptUserWhere = isManager ? { department: user.department! } : {};
  const [totalApps, shadowApps, unresolvedAlerts, offboardingCount] = await Promise.all([
    db.app.count(),
    db.app.count({ where: { status: "shadow" } }),
    db.alert.count({ where: { resolvedAt: null } }),
    db.user.count({ where: { ...deptUserWhere, appUsers: { some: { isActive: true, lastSeen: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } } } }),
  ]);
  const monthlySpend = await db.spendRecord.aggregate({
    _sum: { amount: true },
    where: { period: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
  });
  return { totalApps, shadowApps, unresolvedAlerts, offboardingCount, monthlySpend: Number(monthlySpend._sum.amount ?? 0) };
}

async function getRecentShadowApps(user: SessionUser) {
  const isManager = user.role === "manager" && user.department;
  const deptWhere = isManager
    ? { appUsers: { some: { user: { department: user.department! }, isActive: true } } }
    : {};
  return db.app.findMany({
    where: { status: { in: ["shadow", "review"] }, ...deptWhere },
    orderBy: { discoveredAt: "desc" },
    take: 5,
    select: { id: true, name: true, domain: true, status: true, riskScore: true, discoveredAt: true, _count: { select: { appUsers: { where: { isActive: true } } } } },
  });
}

async function getTopSpend(user: SessionUser) {
  const isManager = user.role === "manager" && user.department;
  const deptWhere = isManager ? { department: user.department! } : {};
  const records = await db.spendRecord.findMany({
    where: { period: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, ...deptWhere },
    include: { app: { select: { name: true } } },
  });
  const byApp = records.reduce<Record<string, { name: string; total: number }>>((acc, r) => {
    const key = r.appId ?? r.merchantName;
    const name = r.app?.name ?? r.merchantName;
    acc[key] = { name, total: (acc[key]?.total ?? 0) + Number(r.amount) };
    return acc;
  }, {});
  return Object.values(byApp).sort((a, b) => b.total - a.total).slice(0, 5);
}

export default async function DashboardPage() {
  const session = await auth();
  const [stats, recentShadow, topSpend] = await Promise.all([getStats(session!.user), getRecentShadowApps(session!.user), getTopSpend(session!.user)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Your SaaS estate at a glance</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Apps", value: stats.totalApps, sub: "Discovered" },
          { label: "Shadow IT", value: stats.shadowApps, sub: "Needs review", warn: stats.shadowApps > 0 },
          { label: "Monthly Spend", value: `$${(stats.monthlySpend / 1000).toFixed(1)}k`, sub: "This month" },
          { label: "Offboarding Risk", value: stats.offboardingCount, sub: "Active access", warn: stats.offboardingCount > 0 },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.warn ? "text-red-600" : "text-slate-900"}`}>{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Recent Shadow IT</h2>
          {recentShadow.length === 0 ? (
            <p className="text-sm text-slate-400">No shadow apps found — great!</p>
          ) : (
            <div className="space-y-2">
              {recentShadow.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{app.name}</p>
                    <p className="text-xs text-slate-500">{app._count.appUsers} users · {formatDistanceToNow(app.discoveredAt, { addSuffix: true })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge score={app.riskScore} />
                    <AppStatusBadge status={app.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Top Spend This Month</h2>
          {topSpend.length === 0 ? (
            <p className="text-sm text-slate-400">No spend data yet. Connect a card feed in Connectors.</p>
          ) : (
            <div className="space-y-3">
              {topSpend.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 flex-1 truncate">{item.name}</span>
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(item.total / topSpend[0].total) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-20 text-right">${item.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
