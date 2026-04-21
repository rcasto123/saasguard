"use client";
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { AppStatusBadge } from "./app-status-badge";
import { RiskBadge } from "./risk-badge";
import { Input } from "@/components/ui/input";

type AppRow = { id: string; name: string; domain: string; category: string | null; status: "shadow" | "review" | "managed" | "denied"; riskScore: number; _count: { appUsers: number }; discoveredAt: string };

const col = createColumnHelper<AppRow>();
const columns = [
  col.accessor("name", { header: "App", cell: (i) => <div><p className="font-medium text-slate-900">{i.getValue()}</p><p className="text-xs text-slate-400">{i.row.original.domain}</p></div> }),
  col.accessor("status", { header: "Status", cell: (i) => <AppStatusBadge status={i.getValue()} /> }),
  col.accessor("riskScore", { header: "Risk", cell: (i) => <RiskBadge score={i.getValue()} /> }),
  col.accessor("_count.appUsers", { header: "Users", cell: (i) => i.getValue() }),
  col.accessor("category", { header: "Category", cell: (i) => i.getValue() ?? "—" }),
  col.accessor("discoveredAt", { header: "Discovered", cell: (i) => new Date(i.getValue()).toLocaleDateString() }),
];

export function AppsTable({ data }: { data: AppRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const table = useReactTable({ data, columns, state: { sorting, globalFilter }, onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel() });

  return (
    <div className="space-y-3">
      <Input placeholder="Search apps..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="max-w-xs" />
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer select-none" onClick={h.column.getToggleSortingHandler()}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === "asc" ? " ↑" : h.column.getIsSorted() === "desc" ? " ↓" : ""}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No apps found</div>}
      </div>
      <p className="text-xs text-slate-400">{table.getFilteredRowModel().rows.length} apps</p>
    </div>
  );
}
