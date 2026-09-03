# @retainai/db

SQL migrations and seed data for the Supabase/Postgres schema.

## Local dev (docker-compose)

The root `docker-compose.yml` spins up a Postgres container and applies
everything in `migrations/` followed by `seed/seed.sql` automatically
(mounted into `/docker-entrypoint-initdb.d`).

## Against a real Supabase project

```bash
supabase link --project-ref <your-project-ref>
supabase db push          # applies migrations/*.sql in order
psql "$DATABASE_URL" -f seed/seed.sql   # optional demo data
```

## Schema overview

- `merchants` — one row per installed Shopify shop.
- `products` / `product_variants` — catalog cache synced from Shopify.
- `orders` / `order_line_items` — order cache synced from Shopify webhooks.
- `return_requests` — the central object: one per item a customer wants to return.
- `negotiations` / `negotiation_messages` — the AI Negotiator's conversation log per return.
- `shipping_labels` — generated return labels (DHL/FedEx/UPS).
- `merchant_revenue_summary` (view) — daily rollup powering the "Revenue Saved vs Revenue Refunded" dashboard chart.
