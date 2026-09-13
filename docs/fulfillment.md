# Pickup and doorstep fulfillment

NuruShop's optional fulfillment flow is controlled by a singleton database
configuration and is disabled by default. When it is disabled—or when the
configuration tables are not yet available during a rolling deployment—the
existing checkout path creates `LEGACY` orders exactly as before.

## Rollout

1. Deploy the additive Prisma migration
   `20260909120000_fulfillment_methods`.
2. Deploy the API and web applications.
3. Sign in as a Senior Admin and open **Dashboard → Delivery**.
4. Add and activate the required pickup stations.
5. Configure the doorstep fee and estimated delivery time.
6. Enable the desired methods, then turn on the overall feature.
7. In **Dashboard → Delivery → Pickup station agents**, create a station-scoped
   account for each person who receives and hands over parcels.
8. Give agents the `/pickup/login` URL. Their 8-hour secure session only exposes
   orders assigned to their station.

Pickup stations are database records; none are seeded or hardcoded. Disabling
or archiving a station removes it from new checkouts. Referenced stations are
archived rather than deleted, and each order also stores its station name,
address, fee, and ETA as an immutable historical snapshot.

## Rollback

Turn off **Delivery methods** in the admin dashboard. New checkouts immediately
return to the legacy flow. Existing pickup and doorstep orders keep their
fulfillment snapshots and remain readable. The additive columns and tables can
remain in place during an application rollback.

## Pricing and validation

The browser submits only `deliveryMethod` and, for pickup, `pickupStationId`.
The API re-reads the live configuration/station inside the serializable checkout
transaction, calculates the fee, and includes it in the order total. Inactive,
archived, missing, or newly disabled selections are rejected with a conflict so
the customer can refresh their choice.

## Pickup custody workflow

Pickup orders progress through `SHIPPED`, `AT_PICKUP_STATION`, and `PICKED_UP`.
An agent may only confirm arrival for an order assigned to their station and may
only confirm collection after arrival. Senior admins retain an explicit status
override for exceptional cases, including recording a customer pickup on the
customer's behalf.

Every transition writes an immutable status-history row containing the previous
and next status, actor type, actor identity, note, and timestamp. Customers see
that history on `/track-order` using the unguessable order number issued at
checkout.

Confirming `AT_PICKUP_STATION` creates a unique `PICKUP_READY` email outbox row,
sends the customer a transactional pickup email, and also creates an in-app
notification for signed-in customers. Failed or interrupted deliveries are
retried every five minutes, up to five attempts, and can also be retried by the
station agent or a senior admin. Resend receives a stable idempotency key so
retries do not duplicate a successfully accepted message.
