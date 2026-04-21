import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || !["admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleUsers = await db.user.findMany({
    where: { appUsers: { some: { isActive: true, lastSeen: { lt: thirtyDaysAgo } } } },
    select: {
      id: true, email: true, name: true, department: true,
      appUsers: { where: { isActive: true }, select: { id: true, lastSeen: true, grantType: true, app: { select: { id: true, name: true, domain: true } } } },
    },
    take: 50,
  });
  return NextResponse.json(staleUsers);
}
