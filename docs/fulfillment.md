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
