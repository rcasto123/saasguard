import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get("count") === "true";
  if (countOnly) {
    const count = await db.alert.count({ where: { resolvedAt: null } });
    return NextResponse.json({ count });
  }
  const alerts = await db.alert.findMany({
    where: { resolvedAt: null },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: 50,
  });
  return NextResponse.json(alerts);
}
