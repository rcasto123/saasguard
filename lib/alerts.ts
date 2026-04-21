import { db } from "@/lib/db";
import nodemailer from "nodemailer";
import { Prisma } from "@prisma/client";
import type { AlertType, AlertSeverity } from "@prisma/client";

// Lazily initialized module-level transporter to avoid creating a new connection per alert
let _transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }
  return _transporter;
}

export async function createAlert(params: {
  type: AlertType;
  severity: AlertSeverity;
  payload: Record<string, unknown>;
}) {
  const alert = await db.alert.create({
    data: {
      type: params.type,
      severity: params.severity,
      payload: params.payload as Prisma.InputJsonValue,
    },
  });

  if (params.severity === "high" || params.severity === "medium") {
    await sendAlertEmail(params.type, params.payload).catch((err) => {
      console.error("[alerts] email send failed:", err.message);
    });
  }

  return alert;
}

async function sendAlertEmail(type: AlertType, payload: Record<string, unknown>) {
  const transporter = getTransporter();
  if (!transporter || !process.env.ALERT_EMAIL_TO) return;

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL_FROM ?? "saasguard@localhost",
    to: process.env.ALERT_EMAIL_TO,
    subject: `[SaaSGuard] Alert: ${type.replace(/_/g, " ")}`,
    text: JSON.stringify(payload, null, 2),
  });
}
