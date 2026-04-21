import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SpendChart } from "@/components/spend-chart";

export default async function SpendPage() {
  const session = await auth();
  const deptFilter = session?.user.role === "manager" && session?.user.department
    ? { department: session.user.department } : {};
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const records = await db.spendRecord.findMany({
    where: { period: { gte: since }, ...deptFilter },
    include: { app: { select: { name: true } } },
    orderBy: { period: "desc" },
  });
  const monthlyMap = records.reduce<Record<string, number>>((acc, r) => {
    const key = r.period.toISOString().slice(0, 7);
    acc[key] = (acc[key] ?? 0) + Number(r.amount);
    return acc;
  }, {});
  const chartData = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }));
  const byApp = records.reduce<Record<string, { name: string; total: number }>>((acc, r) => {
    const key = r.appId ?? r.merchantName;
    const name = r.app?.name ?? r.merchantName;
    acc[key] = { name, total: (acc[key]?.total ?? 0) + Number(r.amount) };
    return acc;
  }, {});
  const topApps = Object.values(byApp).sort((a, b) => b.total - a.total).slice(0, 10);
  const totalSpend = records.reduce((sum, r) => sum + Number(r.amount), 0);

  if (records.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Spend</h1>
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-sm font-medium text-slate-600 mb-1">No spend data yet</p>
          <p className="text-xs text-slate-400 mb-3">
            Connect Stripe, Brex, or Ramp to automatically import transactions, or upload a CSV.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/connectors" className="text-xs text-indigo-600 hover:underline font-medium">Set up a connector →</a>
            {session?.user.role === "admin" && (
              <a href="/spend/upload" className="text-xs text-indigo-600 hover:underline font-medium">Upload CSV →</a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Spend</h1>
          <p className="text-sm text-slate-500">${totalSpend.toLocaleString()} total in the last 12 months</p>
        </div>
        {session?.user.role === "admin" && (
          <a href="/spend/upload" className="text-sm text-indigo-600 hover:underline">
            Upload CSV
          </a>
        )}
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Monthly Trend</h2>
        <SpendChart data={chartData} />
      </div>
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Top Apps by Spend</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">App</th><th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 uppercase">Total</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {topApps.map((app) => (
              <tr key={app.name} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">{app.name}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">${app.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {topApps.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No spend data yet. Connect a card feed or upload a CSV.</div>}
      </div>
    </div>
  );
}
