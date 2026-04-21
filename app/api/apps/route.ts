import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { AppStatus } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as AppStatus | null;
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const deptFilter = session.user.role === "manager" && session.user.department
    ? { appUsers: { some: { user: { department: session.user.department }, isActive: true } } }
    : {};

  const apps = await db.app.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { domain: { contains: search, mode: "insensitive" } }] } : {}),
      ...deptFilter,
    },
    select: {
      id: true,
      name: true,
      domain: true,
      category: true,
      status: true,
      riskScore: true,
      discoveredAt: true,
      discoveredBy: true,
      _count: { select: { appUsers: { where: { isActive: true } } } },
    },
    orderBy: [{ status: "asc" }, { riskScore: "desc" }],
  });

  return NextResponse.json(apps);
}
