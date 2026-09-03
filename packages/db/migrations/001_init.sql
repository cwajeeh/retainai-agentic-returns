-- ============================================================
-- RetainAI initial schema
-- Target: Supabase (Postgres). Designed to run via `supabase db push`
-- or plain `psql -f`. RLS policies at the bottom assume Supabase auth
-- (merchant staff sign in via Supabase Auth; service role bypasses RLS
-- for the backend API and AI service).
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------
-- Merchants (one row per installed Shopify shop)
-- ---------------------------------------------------------------
create table if not exists merchants (
  id uuid primary key default uuid_generate_v4(),
  shop_domain text not null unique,
  shopify_access_token text, -- encrypted at rest by the API layer before insert
  plan_tier text not null default 'starter' check (plan_tier in ('starter', 'growth', 'scale')),
  installed_at timestamptz not null default now(),
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb -- negotiation tone, max discount %, escalation rules, etc.
);

-- ---------------------------------------------------------------
-- Products / variants cache (synced from Shopify webhooks + periodic pull)
-- ---------------------------------------------------------------
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  shopify_product_id text not null,
  title text not null,
  unique (merchant_id, shopify_product_id)
);

create table if not exists product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  shopify_variant_id text not null,
  title text not null,
  price numeric(10, 2) not null,
  inventory_quantity integer not null default 0,
  sku text,
  image_url text,
  unique (product_id, shopify_variant_id)
);

-- ---------------------------------------------------------------
-- Orders / line items (synced from Shopify orders/create webhook)
-- ---------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  shopify_order_id text not null,
  customer_email text not null,
  customer_name text,
  created_at timestamptz not null default now(),
  unique (merchant_id, shopify_order_id)
);

create table if not exists order_line_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  shopify_line_item_id text not null,
  product_id uuid references products(id),
  variant_id uuid references product_variants(id),
  title text not null,
  quantity integer not null default 1,
  price numeric(10, 2) not null
);

-- ---------------------------------------------------------------
-- Return requests — the central object of the product
-- ---------------------------------------------------------------
create table if not exists return_requests (
  id uuid primary key default uuid_generate_v4(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  line_item_id uuid not null references order_line_items(id) on delete cascade,
  reason text not null check (reason in (
    'wrong_size', 'wrong_color', 'changed_mind', 'defective',
    'not_as_described', 'arrived_late', 'other'
  )),
  customer_comment text,
  status text not null default 'requested' check (status in (
    'requested', 'negotiating', 'exchange_accepted', 'upsell_accepted',
    'refund_approved', 'label_generated', 'completed', 'cancelled'
  )),
  resolution text not null default 'none_yet' check (resolution in (
    'exchange', 'upsell', 'refund', 'store_credit', 'none_yet'
  )),
  original_value numeric(10, 2) not null,
  recovered_value numeric(10, 2) not null default 0,
  refunded_value numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_return_requests_merchant on return_requests(merchant_id);
create index if not exists idx_return_requests_status on return_requests(merchant_id, status);

-- ---------------------------------------------------------------
-- Negotiations — one active AI conversation per return request
-- ---------------------------------------------------------------
create table if not exists negotiations (
  id uuid primary key default uuid_generate_v4(),
  return_request_id uuid not null references return_requests(id) on delete cascade,
  merchant_id uuid not null references merchants(id) on delete cascade,
  proposed_variant_id uuid references product_variants(id),
  proposed_upsell_variant_id uuid references product_variants(id),
  sentiment text check (sentiment in ('positive', 'neutral', 'frustrated', 'angry')),
  status text not null default 'open' check (status in ('open', 'resolved', 'escalated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table return_requests
  add column if not exists negotiation_id uuid references negotiations(id);

create table if not exists negotiation_messages (
  id uuid primary key default uuid_generate_v4(),
  negotiation_id uuid not null references negotiations(id) on delete cascade,
  role text not null check (role in ('customer', 'agent', 'system')),
  content text not null,
  function_call jsonb, -- {name, arguments, result}
  created_at timestamptz not null default now()
);

create index if not exists idx_negotiation_messages_negotiation on negotiation_messages(negotiation_id, created_at);

-- ---------------------------------------------------------------
-- Shipping labels
-- ---------------------------------------------------------------
create table if not exists shipping_labels (
  id uuid primary key default uuid_generate_v4(),
  return_request_id uuid not null references return_requests(id) on delete cascade,
  carrier text not null check (carrier in ('dhl', 'fedex', 'ups')),
  tracking_number text not null,
  label_url text not null,
  cost numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table return_requests
  add column if not exists shipping_label_id uuid references shipping_labels(id);

-- ---------------------------------------------------------------
-- Analytics view — Revenue Saved vs Revenue Refunded (dashboard's core metric)
-- ---------------------------------------------------------------
create or replace view merchant_revenue_summary as
select
  merchant_id,
  date_trunc('day', created_at) as day,
  count(*) filter (where status not in ('cancelled')) as total_returns_started,
  coalesce(sum(refunded_value) filter (where resolution = 'refund'), 0) as total_refunded_value,
  coalesce(sum(recovered_value) filter (where resolution in ('exchange', 'upsell')), 0) as total_recovered_value,
  count(*) filter (where resolution = 'exchange') as exchanges,
  count(*) filter (where resolution = 'upsell') as upsells,
  count(*) filter (where resolution = 'refund') as refunds
from return_requests
group by merchant_id, date_trunc('day', created_at);

-- ---------------------------------------------------------------
-- Row Level Security
-- Supabase-specific (relies on the `auth` schema Supabase provisions),
-- so it lives in 002_rls_supabase.sql rather than here — this file stays
-- portable across plain Postgres (docker-compose / local dev) and Supabase.
-- ---------------------------------------------------------------
