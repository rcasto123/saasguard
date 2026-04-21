import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { AppStatus } from "@prisma/client";

const ALLOWED_TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  shadow: ["review", "managed", "denied"],
  review: ["managed", "denied", "shadow"],
  managed: ["denied"],
  denied: ["managed", "review"],
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as { status?: AppStatus; category?: string };
  const app = await db.app.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status) {
    const allowed = ALLOWED_TRANSITIONS[app.status];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: `Cannot transition from ${app.status} to ${body.status}` }, { status: 400 });
    }
  }

  const updated = await db.app.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.category ? { category: body.category } : {}),
    },
    select: { id: true, name: true, status: true, category: true, riskScore: true },
  });
  return NextResponse.json(updated);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const app = await db.app.findUnique({
    where: { id },
    include: {
      appUsers: { where: { isActive: true }, include: { user: { select: { id: true, email: true, name: true, department: true } } }, orderBy: { lastSeen: "desc" } },
      licenses: true,
      spendRecords: { orderBy: { period: "desc" }, take: 12 },
    },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(app);
}
