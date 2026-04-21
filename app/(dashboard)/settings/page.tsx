import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { RoleSelect } from "@/components/role-select";

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/dashboard");

  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, department: true, _count: { select: { appUsers: { where: { isActive: true } } } } },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold text-slate-900">Settings</h1><p className="text-sm text-slate-500">Manage users and their roles</p></div>
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-slate-900">Users ({users.length})</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">User</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Apps</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><p className="font-medium text-slate-900">{user.name}</p><p className="text-xs text-slate-400">{user.email}</p></td>
                <td className="px-4 py-3 text-slate-500 text-xs">{user.department ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{user._count.appUsers}</td>
                <td className="px-4 py-3">{user.id === session?.user.id ? <span className="text-xs text-slate-400 capitalize">{user.role} (you)</span> : <RoleSelect userId={user.id} currentRole={user.role} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
