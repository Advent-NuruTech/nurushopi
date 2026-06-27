# NuruShop — Enterprise Monorepo

A scalable, host-agnostic e-commerce platform.

- **`apps/web`** — Next.js 15 (App Router) frontend / SSR client
- **`apps/api`** — Express + TypeScript API (owns all business logic)
- **`packages/db`** — Prisma schema + client (`@nuru/db`)
- **`packages/types`** — shared Zod DTOs + types (`@nuru/types`)
- **`packages/auth`** — JWT / password / crypto helpers (`@nuru/auth`)
- **`packages/config`** — shared tsconfig / eslint / prettier (`@nuru/config`)

Tooling: **pnpm workspaces** + **Turborepo**. Database: **PostgreSQL** (Supabase now,
portable to AWS RDS / any Postgres later). Auth is built from scratch (email/password +
Google OAuth, JWT access + rotating refresh tokens in httpOnly cookies). Images: Cloudinary.

> **Migration status:** Phase 1 (foundation + auth) is complete. Legacy features still run on
> Firebase and are being migrated module-by-module to the Express API; Firebase is removed once
> every feature has moved.

## Prerequisites

- Node.js >= 20
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- A PostgreSQL database (Supabase recommended)

## Setup

```bash
pnpm install
cp .env.example apps/api/.env        # fill in DATABASE_URL, JWT secrets, Google creds
cp .env.example packages/db/.env     # DATABASE_URL + DIRECT_URL (for Prisma CLI)
# apps/web/.env.local                # NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

pnpm db:generate                     # generate Prisma client
pnpm db:push                         # create tables (or: pnpm db:migrate)
pnpm db:seed                         # creates a senior admin + sample categories
```

## Development

```bash
pnpm dev          # runs web (:3000) + api (:4000) via turbo
pnpm dev:api      # API only
pnpm dev:web      # web only
```

## Quality gates

```bash
pnpm typecheck    # tsc across all packages
pnpm lint
pnpm build
```

## Auth API (v1)

`POST /api/v1/auth/signup · login · logout · refresh · verify-email · forgot-password · reset-password`,
`GET /api/v1/auth/me`, and `GET /api/v1/auth/google` + `/google/callback`.

## ⚠️ Supabase connection note

Supabase **direct** connections (`db.<ref>.supabase.co:5432`) are now **IPv6-only**. If your
network is IPv4-only (most are), Prisma will fail with `P1001: Can't reach database server`.
Use the **Session/Transaction pooler** connection string (IPv4) from the Supabase dashboard
(*Project Settings → Database → Connection string → "Connection pooling"*):

```
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

Also ensure the project is **not paused** (free-tier projects pause after inactivity — resume it
in the dashboard). URL-encode special characters in the password (`/` → `%2F`, etc.).
