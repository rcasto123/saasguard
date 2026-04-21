import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invites = await db.invite.findMany({
    orderBy: { createdAt: "desc" },
    include: { team: { select: { name: true } } },
  });
  return NextResponse.json(invites);
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { email, role, teamId } = body as { email: string; role: UserRole; teamId?: string };

  if (!email || !role) return NextResponse.json({ error: "email and role required" }, { status: 400 });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await db.invite.create({
    data: { email, role, teamId: teamId || null, expiresAt },
  });
  return NextResponse.json(invite, { status: 201 });
}
