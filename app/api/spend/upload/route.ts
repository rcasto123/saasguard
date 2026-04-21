import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseCSVTransactions, merchantToDomain } from "@/lib/connectors/cardfeed";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const text = await file.text();
  const transactions = parseCSVTransactions(text);

  let imported = 0;
  let skipped = 0;

  for (const tx of transactions) {
    if (isNaN(tx.amount) || !tx.merchantName) { skipped++; continue; }
    const domain = merchantToDomain(tx.merchantName);
    let appId: string | null = null;
    if (domain) {
      const app = await db.app.findUnique({ where: { domain } });
      appId = app?.id ?? null;
    }
    let employeeId: string | null = null;
    if (tx.cardholderEmail) {
      const user = await db.user.findUnique({ where: { email: tx.cardholderEmail } });
      employeeId = user?.id ?? null;
    }
    await db.spendRecord.create({
      data: { appId, amount: tx.amount, currency: tx.currency, period: tx.date, source: "csv", merchantName: tx.merchantName, employeeId },
    });
    imported++;
  }
  return NextResponse.json({ imported, skipped });
}
