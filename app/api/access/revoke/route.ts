// app/api/access/revoke/route.ts
// Revokes a user's access to a specific app (sets AppUser.isActive = false).
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  userId: z.string().min(1),
  appId: z.string().min(1),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session || !["admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "userId and appId are required" }, { status: 400 });
  }
  const { userId, appId } = parsed.data;

  const result = await db.appUser.updateMany({
    where: { userId, appId, isActive: true },
    data: { isActive: false },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "No active grant found" }, { status: 404 });
  }

  return NextResponse.json({ revoked: result.count });
}
