"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Users } from "lucide-react";

type Team = {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
};

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/admin/teams");
    setTeams(await res.json());
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
    });
    setName("");
    setDescription("");
    await load();
    setCreating(false);
  }

  async function deleteTeam(id: string) {
    if (!confirm("Delete this team? Members will be unassigned.")) return;
    await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    setTeams((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Teams</h1>
        <p className="text-sm text-slate-500 mt-1">Create and manage organizational teams.</p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Create a team</h2>
        <form onSubmit={createTeam} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Team name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Engineering"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product engineering team"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <Button type="submit" disabled={creating} className="h-9">
              {creating ? "Creating…" : "Create team"}
            </Button>
          </div>
        </form>
      </div>

      {/* Teams list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {teams.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No teams yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Team</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Members</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{team.name}</p>
                    {team.description && (
                      <p className="text-xs text-slate-500">{team.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Users className="w-3.5 h-3.5" />
                      {team._count.members}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 text-red-600 hover:text-red-700"
                      onClick={() => deleteTeam(team.id)}
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
  );
}
