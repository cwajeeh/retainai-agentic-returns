-- ============================================================
-- Local dev seed data: one demo merchant, a small product catalog,
-- one order with two line items. Used by the docker-compose demo
-- flow and by apps/api's `npm run seed` script.
-- ============================================================

insert into merchants (id, shop_domain, plan_tier, settings)
values (
  '11111111-1111-1111-1111-111111111111',
  'demo-store.myshopify.com',
  'growth',
  '{"maxAutoDiscountPct": 15, "escalateOnSentiment": "angry"}'::jsonb
)
on conflict (shop_domain) do nothing;

insert into products (id, merchant_id, shopify_product_id, title)
values
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'gid://shopify/Product/1001', 'Classic Denim Jacket'),
  ('22222222-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'gid://shopify/Product/1002', 'Everyday Sneaker')
on conflict do nothing;

insert into product_variants (id, product_id, shopify_variant_id, title, price, inventory_quantity, sku)
values
  ('31111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 'gid://shopify/ProductVariant/2001', 'Denim Jacket / M', 89.00, 12, 'DJ-M'),
  ('31111111-1111-1111-1111-111111111112', '21111111-1111-1111-1111-111111111111', 'gid://shopify/ProductVariant/2002', 'Denim Jacket / L', 89.00, 3, 'DJ-L'),
  ('32222222-1111-1111-1111-111111111111', '22222222-1111-1111-1111-111111111111', 'gid://shopify/ProductVariant/2003', 'Everyday Sneaker / 9', 65.00, 0, 'SN-9'),
  ('32222222-1111-1111-1111-111111111112', '22222222-1111-1111-1111-111111111111', 'gid://shopify/ProductVariant/2004', 'Everyday Sneaker / 10', 65.00, 20, 'SN-10')
on conflict do nothing;

insert into orders (id, merchant_id, shopify_order_id, customer_email, customer_name)
values (
  '41111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'gid://shopify/Order/5001',
  'jane.doe@example.com',
  'Jane Doe'
)
on conflict do nothing;

insert into order_line_items (id, order_id, shopify_line_item_id, product_id, variant_id, title, quantity, price)
values (
  '51111111-1111-1111-1111-111111111111',
  '41111111-1111-1111-1111-111111111111',
  'gid://shopify/LineItem/6001',
  '21111111-1111-1111-1111-111111111111',
  '31111111-1111-1111-1111-111111111112',
  'Classic Denim Jacket / L',
  1,
  89.00
)
on conflict do nothing;
