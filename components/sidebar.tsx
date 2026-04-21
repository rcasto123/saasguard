// components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Shield, Search, Package, DollarSign, Key, Plug, Settings, LayoutDashboard, Users, Mail, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: number;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "finance", "manager"] },
  { href: "/discovery", label: "Discovery", icon: Search, roles: ["admin", "manager"] },
  { href: "/inventory", label: "App Inventory", icon: Package, roles: ["admin", "finance", "manager"] },
  { href: "/spend", label: "Spend", icon: DollarSign, roles: ["admin", "finance", "manager"] },
  { href: "/access", label: "Access", icon: Key, roles: ["admin", "manager"] },
  { href: "/connectors", label: "Connectors", icon: Plug, roles: ["admin"] },
  { href: "/admin/users", label: "Manage Users", icon: Users, roles: ["admin"] },
  { href: "/admin/invites", label: "Invites", icon: Mail, roles: ["admin"] },
  { href: "/admin/teams", label: "Teams", icon: UsersRound, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "finance";

  const visible = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex flex-col w-52 min-h-screen bg-slate-900 text-slate-400 shrink-0">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-800">
        <Shield className="w-5 h-5 text-indigo-400" />
        <span className="text-white font-bold text-base">SaaSGuard</span>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1 py-2">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors hover:text-white hover:bg-slate-800",
                active && "bg-slate-800 text-white"
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {item.label}
              </span>
              {item.badge != null && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
        <p className="text-xs text-slate-600 capitalize">{role}</p>
      </div>
    </aside>
  );
}
