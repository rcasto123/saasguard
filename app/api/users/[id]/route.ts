import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as { role?: UserRole; department?: string };
  const updated = await db.user.update({
    where: { id },
    data: { ...(body.role ? { role: body.role } : {}), ...(body.department !== undefined ? { department: body.department } : {}) },
    select: { id: true, email: true, name: true, role: true, department: true },
  });
  return NextResponse.json(updated);
}
