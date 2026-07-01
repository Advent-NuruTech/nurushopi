# Build Resilience Notes

Public storefront pages must be able to complete `next build` without a live API server. Server-side catalog and wholesale reads should return empty, production-safe view models for `UPSTREAM_UNREACHABLE` and reserve thrown errors for real contract or application failures.

Vercel/Turborepo environment variables used during build must be declared in `turbo.json` `globalEnv`, otherwise Vercel will not expose them to the task.
