# Public Storefront Architecture

The public storefront (the `app/(public)` route group) is built to **scale
independently** of the admin dashboard and the API. It is served almost entirely
from Next.js's Data Cache, talks to the backend exclusively through a typed,
server-side data layer, and no longer touches Firebase.

## Goals

| Goal | How it's met |
| --- | --- |
| **Scalability** | Storefront reads are cached (ISR) and tagged; the front-end scales on cache hits without loading the API. The data layer can target a private API address (`API_INTERNAL_URL`). |
| **Performance / SEO** | Pages are React Server Components rendered to HTML on the server with cached data — fast first paint, fully crawlable, no client-side data waterfalls. |
| **Maintainability** | One boundary (`lib/view`) maps API DTOs → render-ready view models. A contract change is absorbed there, not across dozens of components. |
| **Decoupling** | The storefront depends on the API's HTTP contract (`@nuru/types`), never on the database or Firebase. It can be extracted into its own deployable (`apps/storefront`) later with no component rewrites. |

## Data flow

```
RSC page  ──>  lib/data/*  ──>  lib/server/http (fetch + Data Cache)  ──>  Express API
   │               │
   │               └─ maps DTOs ─> lib/view/* (view models)
   └─ renders view models; passes them to presentational client components
```

- **`lib/server/http.ts`** — server-only fetch wrapper. Unwraps the
  `{ ok, data }` envelope, throws `ApiError`, and opts into the Data Cache via
  `next: { tags, revalidate }`. Uses `API_INTERNAL_URL` (falls back to
  `NEXT_PUBLIC_API_URL`).
- **`lib/server/cache-tags.ts`** — the single registry of cache tags and
  revalidation windows. Readers tag; the webhook purges.
- **`lib/data/catalog.ts`, `lib/data/wholesale.ts`** — domain data access
  (`listProducts`, `getProduct`, `listBanners`, `listWholesaleItems`, …).
  Each returns view models and sets tags + a `revalidate` window.
- **`lib/view/catalog.ts`** — DTO → view-model mappers. Converts string money to
  numbers, resolves image fallbacks, brands `href` with the `Route` type, and
  computes derived flags (`isNew`).

## Caching & revalidation

Each cached read is tagged (e.g. `products`, `product:<id>`, `banners`,
`wholesale`) with a time-based `revalidate` window as a safety net. For instant
freshness after an admin/API write, purge on demand:

```
POST /api/revalidate
Header: x-revalidate-secret: $REVALIDATE_SECRET
Body:   { "tags": ["products", "product:abc"], "paths": ["/shop"] }
```

Wire this call into admin product/category/banner/hero/wholesale mutations (or
emit it from the API after a successful write). Until then, content refreshes
within its `revalidate` window automatically.

### Env vars

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public API base for the browser client (`lib/api.ts`). |
| `API_INTERNAL_URL` | Private API base for server-side reads. Optional; falls back to the public URL. |
| `REVALIDATE_SECRET` | Shared secret guarding `POST /api/revalidate`. |

## Server vs. client split

Pages are Server Components; only genuinely interactive leaves are
`"use client"` and receive data as props:

- `NewArrivals`, `Bannerss`, `WholesaleCard/Grid` — presentational, props-driven.
- `products/[id]` and `wholeseller/[id]` — a server `page.tsx` fetches +
  `notFound()`s, then renders a client `*DetailView` for cart, gallery, modal
  and (user-specific) reviews.

## Migrated (Firebase-free, API + ISR)

`/` (home), `/shop`, `/new-arrivals`, `/products/[id]`, `/banners`,
`/banners/[id]`, `/wholeseller`, `/wholeseller/[id]`, `/share`, plus the
`NewArrivals`, `Bannerss`, `WholesaleGrid`, `WholesaleCard` components.

## Write / cart flows (Firebase-free, browser client `lib/api.ts`)

These are **mutation / user-specific** flows, not catalog reads, so they use the
browser client `lib/api.ts` (credentialed, cookie-session) rather than the
cached server layer:

- **`/checkout`** → `orderApi.checkout()` (POST `/orders/checkout`). Reads the
  cart from `CartContext`, gates on `useAppUser()` (cookie session), composes
  the delivery `address`, optionally applies wallet credit (`useWallet`), then
  shows the returned order number. Related products load via
  `catalogApi.listProducts`.
- **`/contact`** → `contactApi.submit()` (POST `/contact`).
- **`/share`** → server component reading the cached `listProducts`; the share
  cards are presentational.

## Shared chrome (Firebase-free)

`Navbar`, `Sidebar`, `SearchBar`, `CartIcon`, and `UserNotificationsBell` no
longer touch Firebase:

- Auth state comes from `useAppUser()` (the `/auth/me` cookie session); logout
  calls `useAppUser().logout()`.
- `Navbar` categories load via `catalogApi.listCategories()`.
- `SearchBar` queries `catalogApi.listProducts({ search })`.
- `UserNotificationsBell` polls `notificationsApi.list()` (30s) instead of a
  Firestore realtime subscription; marks read via `notificationsApi`.

### Pattern to follow for a new read page

```ts
// app/(public)/example/page.tsx  (Server Component)
import { listProducts } from "@/lib/data/catalog";

export default async function ExamplePage() {
  const { items } = await listProducts({ pageSize: 24, sort: "newest" });
  return <Grid products={items} />; // items are ProductCardVM[]
}
```

No `force-dynamic`, no Firebase, no manual fetch — the data layer handles
caching, tagging, DTO mapping and error handling.
