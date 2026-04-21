import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const teams = await db.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, description } = body as { name: string; description?: string };

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const team = await db.team.create({ data: { name, description } });
  return NextResponse.json(team, { status: 201 });
}
