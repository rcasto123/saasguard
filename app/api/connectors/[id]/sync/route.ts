import { auth } from "@/auth";
import { db } from "@/lib/db";
import { syncQueue } from "@/worker/queue";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const connector = await db.connector.findUnique({ where: { id }, select: { id: true, type: true } });
  if (!connector) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const job = await syncQueue.add(connector.type, { connectorId: connector.id }, { attempts: 3, backoff: { type: "exponential", delay: 60_000 } });
  return NextResponse.json({ jobId: job.id, status: "queued" });
}
