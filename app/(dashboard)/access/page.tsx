import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";

export default async function AccessPage() {
  const session = await auth();
  const deptFilter = session?.user.role === "manager" && session?.user.department
    ? { user: { department: session.user.department } } : {};
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [activeAccess, offboardingRisk] = await Promise.all([
    db.appUser.findMany({
      where: { isActive: true, ...deptFilter },
      include: { user: { select: { id: true, email: true, name: true, department: true } }, app: { select: { id: true, name: true, domain: true, status: true } } },
      orderBy: { lastSeen: "desc" },
      take: 100,
    }),
    db.user.findMany({
      where: { appUsers: { some: { isActive: true, lastSeen: { lt: thirtyDaysAgo }, ...deptFilter } } },
      select: { id: true, email: true, name: true, department: true, appUsers: { where: { isActive: true }, select: { app: { select: { name: true, domain: true } }, lastSeen: true } } },
      take: 20,
    }),
  ]);

  const staleAccess = activeAccess.filter((au) => au.lastSeen < ninetyDaysAgo);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Access</h1>
        <p className="text-sm text-slate-500">{activeAccess.length} active grants · {staleAccess.length} stale · {offboardingRisk.length} offboarding risk</p>
      </div>
      {offboardingRisk.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-red-800 mb-3">Offboarding Risk ({offboardingRisk.length})</h2>
          <div className="space-y-2">
            {offboardingRisk.map((user) => (
              <div key={user.id} className="bg-white rounded-md p-3 border border-red-100">
                <div className="flex items-start justify-between">
                  <div><p className="font-medium text-slate-900 text-sm">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div>
                  <span className="text-xs text-red-600 font-medium">{user.appUsers.length} active apps</span>
                </div>
                <div className="mt-2 flex gap-1 flex-wrap">
                  {user.appUsers.map((au) => (
                    <span key={au.app.name} className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{au.app.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Active Access</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">User</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">App</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Last Seen</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Grant</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {activeAccess.map((au) => (
              <tr key={au.id} className={`hover:bg-slate-50 ${au.lastSeen < ninetyDaysAgo ? "bg-yellow-50" : ""}`}>
                <td className="px-4 py-3"><p className="font-medium text-slate-900">{au.user.name}</p><p className="text-xs text-slate-400">{au.user.email}</p></td>
                <td className="px-4 py-3"><p className="text-slate-900">{au.app.name}</p><p className="text-xs text-slate-400">{au.app.domain}</p></td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatDistanceToNow(au.lastSeen, { addSuffix: true })}</td>
                <td className="px-4 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{au.grantType}</span></td>
                <td className="px-4 py-3">{au.lastSeen < ninetyDaysAgo ? <span className="text-xs text-yellow-700 font-medium">Stale</span> : <span className="text-xs text-green-700">Active</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
