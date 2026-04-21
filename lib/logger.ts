// lib/logger.ts
// Structured JSON logger using pino.
// In development, output is human-readable. In production, output is JSON.
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino/file",
      options: { destination: 1 }, // stdout, human-readable in dev via default pino format
    },
  }),
});

/** Create a child logger with a fixed module name for log filtering. */
export function createLogger(module: string) {
  return logger.child({ module });
}
