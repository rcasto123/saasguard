import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const connector = await db.connector.findUnique({
    where: { id },
    select: { id: true, type: true, status: true, lastSyncAt: true, lastSyncStatus: true, syncFrequency: true, config: true },
  });
  if (!connector) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(connector);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db.connector.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
