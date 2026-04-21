import { db } from "@/lib/db";
import { auth } from "@/auth";
import { AppsTable } from "@/components/apps-table";

export default async function InventoryPage() {
  const session = await auth();
  const deptFilter = session?.user.role === "manager" && session.user.department
    ? { appUsers: { some: { user: { department: session.user.department }, isActive: true } } }
    : {};
  const apps = await db.app.findMany({
    where: deptFilter,
    select: { id: true, name: true, domain: true, category: true, status: true, riskScore: true, discoveredAt: true, _count: { select: { appUsers: { where: { isActive: true } } } } },
    orderBy: [{ status: "asc" }, { riskScore: "desc" }],
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">App Inventory</h1>
        <p className="text-sm text-slate-500">{apps.length} apps discovered</p>
      </div>
      <AppsTable data={apps.map((a) => ({ ...a, discoveredAt: a.discoveredAt.toISOString() }))} />
    </div>
  );
}
