// lib/env.ts
// Validates required environment variables at startup using Zod.
// Import this module in your entry points to get early failure on misconfiguration.

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  ALLOWED_EMAIL_DOMAIN: z.string().min(1),
  // Optional integrations
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  OKTA_CLIENT_ID: z.string().optional(),
  OKTA_CLIENT_SECRET: z.string().optional(),
  OKTA_ISSUER: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  ALERT_EMAIL_FROM: z.string().optional(),
  ALERT_EMAIL_TO: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`❌ Invalid environment variables:\n${missing}`);
  }
  return result.data;
}

// Validated env — throws at import time if invalid
export const env = validateEnv();
