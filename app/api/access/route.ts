import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !["admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const appId = searchParams.get("appId");
  const deptFilter = session.user.role === "manager" && session.user.department
    ? { user: { department: session.user.department } }
    : {};

  const appUsers = await db.appUser.findMany({
    where: { isActive: true, ...(userId ? { userId } : {}), ...(appId ? { appId } : {}), ...deptFilter },
    include: {
      user: { select: { id: true, email: true, name: true, department: true } },
      app: { select: { id: true, name: true, domain: true, status: true } },
    },
    orderBy: { lastSeen: "desc" },
    take: 200,
  });

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const withStaleFlag = appUsers.map((au) => ({ ...au, isStale: au.lastSeen < ninetyDaysAgo }));
  return NextResponse.json(withStaleFlag);
}
