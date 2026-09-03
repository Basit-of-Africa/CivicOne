import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().default("http://localhost:3000"),
  APP_NAME: z.string().default("CivicOne Nigeria"),
  EMAIL_FROM: z.string().default("no-reply@civicone.ng"),
  SESSION_COOKIE_NAME: z.string().default("civone_session"),
  SESSION_COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(604800),
  EMAIL_VERIFICATION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(86400),
  PASSWORD_RESET_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  IDENTITY_ENCRYPTION_KEY: z
    .string()
    .min(32, "IDENTITY_ENCRYPTION_KEY must be at least 32 characters")
    .default(
      "civicone-dev-identity-key-change-me-in-production-0123456789abcdef",
    ),
  RATE_LIMIT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  DOCUMENT_SIGNING_SECRET: z
    .string()
    .min(16, "DOCUMENT_SIGNING_SECRET must be at least 16 characters")
    .default("civicone-demo-document-signing-secret-change-me"),
  DOCUMENT_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  // Phase 6C — Paystack
  PAYSTACK_SECRET_KEY: z.string().default(""),
  PAYSTACK_PUBLIC_KEY: z.string().default(""),
  PAYSTACK_WEBHOOK_SECRET: z.string().default(""),
  // Phase 6C — Resend (Email)
  RESEND_API_KEY: z.string().default(""),
  // Vercel Cron Jobs — used to authenticate cron requests
  CRON_SECRET: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
