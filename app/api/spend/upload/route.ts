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

  // Separate valid from invalid transactions upfront
  const validTxs = transactions.filter((tx) => !isNaN(tx.amount) && !!tx.merchantName);
  const skipped = transactions.length - validTxs.length;

  // Collect all unique domains and emails for bulk lookup
  const uniqueDomains = [...new Set(validTxs.map((tx) => merchantToDomain(tx.merchantName)).filter(Boolean) as string[])];
  const uniqueEmails = [...new Set(validTxs.map((tx) => tx.cardholderEmail).filter(Boolean) as string[])];

  // Single bulk query for domains → app map
  const apps = uniqueDomains.length > 0
    ? await db.app.findMany({ where: { domain: { in: uniqueDomains } }, select: { id: true, domain: true } })
    : [];
  const domainToAppId = new Map(apps.map((a) => [a.domain, a.id]));

  // Single bulk query for emails → user map
  const users = uniqueEmails.length > 0
    ? await db.user.findMany({ where: { email: { in: uniqueEmails } }, select: { id: true, email: true } })
    : [];
  const emailToUserId = new Map(users.map((u) => [u.email, u.id]));

  // Create all spend records using the pre-built maps
  let imported = 0;
  for (const tx of validTxs) {
    const domain = merchantToDomain(tx.merchantName);
    const appId = domain ? (domainToAppId.get(domain) ?? null) : null;
    const employeeId = tx.cardholderEmail ? (emailToUserId.get(tx.cardholderEmail) ?? null) : null;
    await db.spendRecord.create({
      data: { appId, amount: tx.amount, currency: tx.currency, period: tx.date, source: "csv", merchantName: tx.merchantName, employeeId },
    });
    imported++;
  }
  return NextResponse.json({ imported, skipped });
}
