import { auth } from "@/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { ConnectorType } from "@prisma/client";
import { CronExpressionParser } from "cron-parser";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const connectors = await db.connector.findMany({
    select: { id: true, type: true, status: true, lastSyncAt: true, lastSyncStatus: true, syncFrequency: true, config: true, createdAt: true, updatedAt: true },
    orderBy: { type: "asc" },
  });
  return NextResponse.json(connectors);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json() as { type: ConnectorType; credentials: Record<string, string>; config?: Record<string, unknown>; syncFrequency?: string };
  if (!body.type || !body.credentials) {
    return NextResponse.json({ error: "type and credentials are required" }, { status: 400 });
  }
  if (body.syncFrequency) {
    try {
      CronExpressionParser.parse(body.syncFrequency);
    } catch {
      return NextResponse.json({ error: "Invalid cron expression for syncFrequency" }, { status: 400 });
    }
  }
  const credentialsEnc = encrypt(JSON.stringify(body.credentials));
  const connector = await db.connector.upsert({
    where: { type: body.type },
    create: { type: body.type, status: "pending", credentialsEnc, config: (body.config ?? {}) as Prisma.InputJsonValue, syncFrequency: body.syncFrequency ?? "0 2 * * *" },
    update: { credentialsEnc, status: "pending", config: (body.config ?? {}) as Prisma.InputJsonValue, syncFrequency: body.syncFrequency ?? "0 2 * * *" },
    select: { id: true, type: true, status: true, syncFrequency: true, config: true },
  });
  return NextResponse.json(connector, { status: 201 });
}
