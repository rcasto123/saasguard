import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const months = Number(searchParams.get("months") ?? "12");
  const department = searchParams.get("department");

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const deptFilter = session.user.role === "manager"
    ? { department: session.user.department ?? undefined }
    : department
    ? { department }
    : {};

  const records = await db.spendRecord.findMany({
    where: { period: { gte: since }, ...deptFilter },
    include: { app: { select: { id: true, name: true, domain: true, category: true } } },
    orderBy: { period: "desc" },
  });

  const monthlyTotals = records.reduce<Record<string, number>>((acc, r) => {
    const key = r.period.toISOString().slice(0, 7);
    acc[key] = (acc[key] ?? 0) + Number(r.amount);
    return acc;
  }, {});

  const byApp = records.reduce<Record<string, { name: string; total: number }>>((acc, r) => {
    const key = r.appId ?? r.merchantName;
    const name = r.app?.name ?? r.merchantName;
    acc[key] = { name, total: (acc[key]?.total ?? 0) + Number(r.amount) };
    return acc;
  }, {});

  const topApps = Object.entries(byApp)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 20)
    .map(([id, data]) => ({ id, ...data }));

  return NextResponse.json({ records, monthlyTotals, topApps });
}
