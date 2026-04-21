"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Trash2 } from "lucide-react";
import type { UserRole } from "@prisma/client";

type Team = { id: string; name: string };
type Invite = {
  id: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  team: { name: string } | null;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("manager");
  const [teamId, setTeamId] = useState<string>("none");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    load();
    fetch("/api/admin/teams").then((r) => r.json()).then(setTeams);
  }, []);

  async function load() {
    const res = await fetch("/api/admin/invites");
    setInvites(await res.json());
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, teamId: teamId === "none" ? null : teamId }),
    });
    setEmail("");
    setRole("manager");
    setTeamId("none");
    await load();
    setSending(false);
  }

  async function revoke(id: string) {
    await fetch(`/api/admin/invites/${id}`, { method: "DELETE" });
    setInvites((prev) => prev.filter((i) => i.id !== id));
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/signup?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  const pending = invites.filter((i) => !i.usedAt && new Date(i.expiresAt) > new Date());
  const used = invites.filter((i) => i.usedAt || new Date(i.expiresAt) <= new Date());

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invites</h1>
        <p className="text-sm text-slate-500 mt-1">Send invite links to new team members.</p>
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Send an invite</h2>
        <form onSubmit={sendInvite} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Team (optional)</label>
            <Select value={teamId} onValueChange={(v) => v !== null && setTeamId(v)}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="No team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={sending} className="h-9">
            {sending ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </div>

      {/* Pending invites */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Pending ({pending.length})</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {pending.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No pending invites.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Team</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Expires</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{inv.email}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{inv.role}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.team?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 gap-1"
                        onClick={() => copyLink(inv.token)}
                      >
                        <Copy className="w-3 h-3" />
                        {copied === inv.token ? "Copied!" : "Copy link"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-red-600 hover:text-red-700"
                        onClick={() => revoke(inv.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Used/expired */}
      {used.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Used / Expired ({used.length})</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {used.map((inv) => (
                  <tr key={inv.id} className="opacity-60">
                    <td className="px-4 py-3 text-slate-900">{inv.email}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{inv.role}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {inv.usedAt ? "Used" : "Expired"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
