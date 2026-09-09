# NuruShop merchandising and retention platform

## Current architecture assessment

NuruShop is a pnpm monorepo with a PostgreSQL/Prisma data layer, Express API,
Next.js storefront, cookie/JWT customer and admin authentication, and Next Data
Cache storefront reads. The existing `products`, `orders`, `order_items`,
`users`, `reviews`, `product_views`, `admins`, `admin_logs`, and product `stock`
remain canonical.

Important current constraints are preserved instead of hidden:

- Products retain one authoritative stock counter and now have an optional
  vendor owner. Existing admin-managed rows remain ownerless; vendor reads and
  writes are always scoped by `vendorId`.
- `sellingPrice` remains supported for legacy catalog offers. All new temporary
  campaigns use `promotions` and never mutate the product row.
- PostgreSQL and Next Data Cache are economically appropriate today. The data
  model and cache versions allow Redis, a queue, and OpenSearch to be introduced
  without changing the public contracts.

## Separation of concerns

| Concern         | Source                                                    |
| --------------- | --------------------------------------------------------- |
| Identity        | `merchandising_collections.id` and immutable unique `key` |
| Presentation    | editable collection display fields                        |
| Eligibility     | memberships, time windows, product status/stock, rules    |
| Ranking         | versioned ranking snapshots and expiring overrides        |
| Placement       | scheduled `homepage_sections`                             |
| Promotion       | time-bound campaign/product rows and redemption counters  |
| Personalization | global candidates plus user affinities and diversity      |
| Analytics       | immutable event ids, aggregates, ranking snapshots        |

The initial identities are `flash_sale`, `new_arrivals`, `best_sellers`,
`spotlight`, `bundles`, and `trending`. Seed execution creates them once and
never overwrites their display names.

## Request and processing flow

```text
commerce events -> idempotent ingestion -> hourly aggregates
                -> scoring worker -> immutable ranking snapshot
                -> global candidate read -> optional affinity rerank
                -> diversity + live promotion price -> homepage API
```

The homepage never scans `commerce_events`. If affinity lookup fails, each
section independently retries the global candidate path. If a section still
fails, other sections render. The last unexpired ranking remains readable while
a worker is delayed; indexed product fallback is the final safe default.

## APIs

Public/mobile:

- `GET /api/v1/homepage`
- `GET /api/v1/collections`
- `GET /api/v1/collections/:key/products?cursor=...&limit=...`
- `POST /api/v1/events` (1–100 idempotent events)
- `POST /api/v1/bundles/quote`
- `GET|PUT /api/v1/retention/preferences`
- `POST|DELETE /api/v1/retention/subscriptions`

Admin control plane (authenticated, writes require senior role):

- `/api/v1/admin/merchandising/collections`
- `/api/v1/admin/merchandising/collections/:id/memberships`
- `/api/v1/admin/merchandising/collections/:id/overrides`
- `/api/v1/admin/merchandising/collections/:id/analytics`
- `/api/v1/admin/merchandising/homepage-sections`
- `/api/v1/admin/merchandising/promotions`

Inventory import and vendor control plane:

- `POST /api/v1/admin/catalog/products/import`
- `GET|POST|PUT|DELETE /api/v1/vendor/catalog/products`
- `GET|POST|PUT|DELETE /api/v1/vendor/wholesale/items`
- `GET /api/v1/vendor/merchandising/collections`
- `GET|POST|DELETE /api/v1/vendor/merchandising/collections/:id/memberships`

CSV/JSON imports accept up to 250 rows, use SKU-based duplicate handling, and
return a result for every row. A `both` row creates or updates retail and
wholesale records in one database transaction. Retail rows may reference
immutable collection keys; wholesale rows automatically enter the existing
wholesale discovery feed.

Collection pages use immutable keys, not display names. Collection pagination
uses `(rank, productId)` keysets encoded as opaque cursors; no collection query
uses `OFFSET`.

## Price and inventory correctness

At checkout, the API reloads products and currently active promotion products,
calculates effective prices, conditionally decrements product stock, conditionally
increments campaign and product purchase counters, records redemptions, and
creates the order under serializable isolation. Client prices, discount values,
stock, and campaign eligibility are ignored. Cached homepage availability is
never authoritative.

Bundles are quoted only after required-item, date, bundle limit, active-product,
and inventory checks. A bundle checkout input can be introduced when the cart
supports bundle identity; until then the API does not accept a client-supplied
bundle discount.

## Jobs and freshness

Run `pnpm --filter api worker:merchandising` from a scheduler. The job is
idempotent and safe to retry.

| Work                                     | Target cadence   | Reason                                                 |
| ---------------------------------------- | ---------------- | ------------------------------------------------------ |
| promotion status and expired memberships | every minute     | operational correctness; reads also enforce timestamps |
| event-to-hour aggregate                  | every 5 minutes  | near-real-time discovery without request-time scans    |
| trending                                 | every 15 minutes | reacts to velocity while damping noise                 |
| Fresh Finds                              | hourly           | publication eligibility changes slowly                 |
| rolling bestseller                       | hourly           | commerce quality does not need per-request updates     |
| retention outbox                         | every minute     | timely but frequency-capped notifications              |
| daily rollups/long retention             | nightly          | reporting and storage efficiency                       |

At larger traffic, split this command into queue consumers with leases. Event
ingestion is already append-only/idempotent and the aggregate query is bounded,
so the API contract is unchanged.

## Cache architecture

Anonymous homepage responses emit shared-cache headers and Next caches the
anonymous document for 60 seconds. Authenticated/personalized responses are
private and never enter a global page cache.

For multiple API replicas, use Redis with keys shaped as:

```text
collection:{collectionId}:version:{cacheVersion}:segment:{segment}:cursor:{cursorHash}
homepage-layout:{layoutVersion}:device:{device}:segment:{segment}
```

Store global and segment candidates, not completed personalized homepages.
Affinity reranking stays per request or in a short private cache. Every admin
collection or override mutation increments only that collection's
`cacheVersion`; old keys expire naturally, so unrelated collections are not
flushed.

## Search evolution

PostgreSQL handles the current indexed category, price, availability and ranked
membership reads. Before collections regularly exceed 100k searchable products,
stream the product document plus collection ids/ranks to OpenSearch. Perform
category, price, seller, rating, availability and text relevance there, then
batch-hydrate only returned ids from PostgreSQL. Seller filtering uses the
authoritative optional `products.vendorId` relation.

## Retention and consent

Customers explicitly opt into a channel/topic and can follow a product for
back-in-stock or price-drop events. Catalog writes create deduplicated outbox
triggers transactionally. The dispatcher verifies consent again and enforces
daily/weekly caps before creating an in-app notification. Email/SMS/push remain
disabled until their channel transport and consent evidence are configured.

## Observability and alerts

API request logging already measures status and request duration; the worker
emits a structured completion/failure record with candidate counts and event
lag inputs. Production dashboards should chart API p50/p95/p99, homepage p95,
cache hit rate, DB p95, job duration, event lag, expired active promotions,
queue depth, failed triggers, stock conflicts, and ranking snapshot age.

Alert when homepage p95 exceeds 500 ms for 10 minutes, event lag exceeds 30
minutes, the newest ranking is older than two hours, an ended promotion remains
active for five minutes, a worker fails three runs, or checkout inventory
conflicts rise sharply. Promotion timestamps are enforced on reads and checkout,
so a status-worker failure cannot extend a discount.

## Rollout

1. Deploy the additive migration and generated client. Existing storefront
   behavior remains available if no sections exist.
2. Seed immutable identities and homepage placements; run the worker in shadow
   mode and compare candidates with current New Arrivals/Most Viewed surfaces.
3. Enable `GET /homepage` for anonymous traffic, then ramp by percentage while
   watching latency, empty-section rate, stock conflicts and conversion.
4. Create promotions and bundles in draft, preview, then schedule. Enable event
   ingestion and aggregate jobs before algorithmic sections.
5. Enable signed-in affinity reranking and experiments only after event quality
   checks. Optimize for conversion, revenue per impression and repeat visits,
   with returns/cancellations as guardrails.
6. Enable retention topics per channel only after explicit consent UI and
   delivery integration are live.

Rollback is configuration-first: pause homepage sections or collections. The
schema is additive and the legacy catalog homepage fallback remains independent.
