import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, department: true, teamId: true, isActive: true, createdAt: true, _count: { select: { appUsers: { where: { isActive: true } } } } },
    orderBy: { email: "asc" },
  });
  return NextResponse.json(users);
}
