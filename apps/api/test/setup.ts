// Runs before any test module is imported, so the env validation in src/env.ts
// sees valid values. dotenv (loaded by env.ts) does not override these.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-0123456789abcdef";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-0123456789abcdef";
process.env.WEB_ORIGIN ??= "http://localhost:3000";
process.env.API_PUBLIC_URL ??= "http://localhost:4000";
process.env.WEB_APP_URL ??= "http://localhost:3000";
