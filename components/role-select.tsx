"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from "@prisma/client";

export function RoleSelect({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(role: UserRole) {
    setSaving(true);
    await fetch(`/api/users/${userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    setSaving(false);
    router.refresh();
  }

  return (
    <Select value={currentRole} onValueChange={(v) => handleChange(v as UserRole)} disabled={saving}>
      <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="finance">Finance</SelectItem>
        <SelectItem value="manager">Manager</SelectItem>
      </SelectContent>
    </Select>
  );
}
