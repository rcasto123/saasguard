import { db } from "@/lib/db";
import nodemailer from "nodemailer";
import type { AlertType, AlertSeverity } from "@prisma/client";

export async function createAlert(params: {
  type: AlertType;
  severity: AlertSeverity;
  payload: Record<string, unknown>;
}) {
  const alert = await db.alert.create({
    data: {
      type: params.type,
      severity: params.severity,
      payload: params.payload,
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
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL_FROM, ALERT_EMAIL_TO } = process.env;
  if (!SMTP_HOST || !ALERT_EMAIL_TO) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  await transporter.sendMail({
    from: ALERT_EMAIL_FROM ?? "saasguard@localhost",
    to: ALERT_EMAIL_TO,
    subject: `[SaaSGuard] Alert: ${type.replace(/_/g, " ")}`,
    text: JSON.stringify(payload, null, 2),
  });
}
