process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/civicone_test";
process.env.APP_URL = process.env.APP_URL ?? "http://localhost:3000";
process.env.RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED ?? "true";
process.env.RATE_LIMIT_MAX_ATTEMPTS = "5";
process.env.RATE_LIMIT_WINDOW_MS = "10000";
