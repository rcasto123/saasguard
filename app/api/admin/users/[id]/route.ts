import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { role, teamId, isActive } = body as { role?: UserRole; teamId?: string | null; isActive?: boolean };

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(role !== undefined && { role }),
      ...(teamId !== undefined && { teamId: teamId || null }),
      ...(isActive !== undefined && { isActive }),
    },
    select: { id: true, email: true, name: true, role: true, teamId: true, isActive: true },
  });
  return NextResponse.json(updated);
}
