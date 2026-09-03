import { pool } from "./pool";
import type {
  Merchant,
  Order,
  OrderLineItem,
  ReturnRequest,
  Negotiation,
  NegotiationMessage,
  ShippingLabel,
  RevenueSummary,
  ReturnReason,
  ProductVariant,
} from "@retainai/shared";

// ---------------------------------------------------------------
// Merchants
// ---------------------------------------------------------------
export async function getMerchantByShopDomain(shopDomain: string): Promise<Merchant | null> {
  const { rows } = await pool.query(
    `select id, shop_domain, shopify_access_token, plan_tier, installed_at, is_active
     from merchants where shop_domain = $1`,
    [shopDomain],
  );
  if (rows.length === 0) return null;
  return mapMerchant(rows[0]);
}

export async function getMerchantById(id: string): Promise<Merchant | null> {
  const { rows } = await pool.query(
    `select id, shop_domain, shopify_access_token, plan_tier, installed_at, is_active
     from merchants where id = $1`,
    [id],
  );
  if (rows.length === 0) return null;
  return mapMerchant(rows[0]);
}

export async function upsertMerchant(shopDomain: string, accessToken: string): Promise<Merchant> {
  const { rows } = await pool.query(
    `insert into merchants (shop_domain, shopify_access_token)
     values ($1, $2)
     on conflict (shop_domain) do update set shopify_access_token = excluded.shopify_access_token, is_active = true
     returning id, shop_domain, shopify_access_token, plan_tier, installed_at, is_active`,
    [shopDomain, accessToken],
  );
  return mapMerchant(rows[0]);
}

function mapMerchant(row: any): Merchant {
  return {
    id: row.id,
    shopDomain: row.shop_domain,
    shopifyAccessToken: row.shopify_access_token,
    planTier: row.plan_tier,
    installedAt: row.installed_at,
    isActive: row.is_active,
  };
}

// ---------------------------------------------------------------
// Orders / line items
// ---------------------------------------------------------------
export async function getOrderWithLineItem(
  lineItemId: string,
): Promise<{ order: Order; lineItem: OrderLineItem } | null> {
  const { rows } = await pool.query(
    `select
       o.id as order_id, o.shopify_order_id, o.merchant_id, o.customer_email, o.customer_name, o.created_at as order_created_at,
       li.id as li_id, li.shopify_line_item_id, li.product_id, li.variant_id, li.title, li.quantity, li.price
     from order_line_items li
     join orders o on o.id = li.order_id
     where li.id = $1`,
    [lineItemId],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    order: {
      id: r.order_id,
      shopifyOrderId: r.shopify_order_id,
      merchantId: r.merchant_id,
      customerEmail: r.customer_email,
      customerName: r.customer_name,
      lineItems: [],
      createdAt: r.order_created_at,
    },
    lineItem: {
      id: r.li_id,
      shopifyLineItemId: r.shopify_line_item_id,
      productId: r.product_id,
      variantId: r.variant_id,
      title: r.title,
      quantity: r.quantity,
      price: Number(r.price),
    },
  };
}

// ---------------------------------------------------------------
// Return requests
// ---------------------------------------------------------------
export async function createReturnRequest(input: {
  merchantId: string;
  orderId: string;
  lineItemId: string;
  reason: ReturnReason;
  customerComment?: string;
  originalValue: number;
}): Promise<ReturnRequest> {
  const { rows } = await pool.query(
    `insert into return_requests (merchant_id, order_id, line_item_id, reason, customer_comment, original_value)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [input.merchantId, input.orderId, input.lineItemId, input.reason, input.customerComment ?? null, input.originalValue],
  );
  return mapReturnRequest(rows[0]);
}

export async function getReturnRequest(id: string): Promise<ReturnRequest | null> {
  const { rows } = await pool.query(`select * from return_requests where id = $1`, [id]);
  if (rows.length === 0) return null;
  return mapReturnRequest(rows[0]);
}

export async function listReturnRequests(merchantId: string, limit = 50): Promise<ReturnRequest[]> {
  const { rows } = await pool.query(
    `select * from return_requests where merchant_id = $1 order by created_at desc limit $2`,
    [merchantId, limit],
  );
  return rows.map(mapReturnRequest);
}

export async function updateReturnRequest(
  id: string,
  patch: Partial<{
    status: ReturnRequest["status"];
    resolution: ReturnRequest["resolution"];
    recoveredValue: number;
    refundedValue: number;
    negotiationId: string;
    shippingLabelId: string;
  }>,
): Promise<ReturnRequest> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const colMap: Record<string, string> = {
    status: "status",
    resolution: "resolution",
    recoveredValue: "recovered_value",
    refundedValue: "refunded_value",
    negotiationId: "negotiation_id",
    shippingLabelId: "shipping_label_id",
  };

  for (const [key, col] of Object.entries(colMap)) {
    const val = (patch as Record<string, unknown>)[key];
    if (val !== undefined) {
      fields.push(`${col} = $${i}`);
      values.push(val);
      i += 1;
    }
  }
  fields.push(`updated_at = now()`);
  values.push(id);

  const { rows } = await pool.query(
    `update return_requests set ${fields.join(", ")} where id = $${i} returning *`,
    values,
  );
  return mapReturnRequest(rows[0]);
}

function mapReturnRequest(row: any): ReturnRequest {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    orderId: row.order_id,
    lineItemId: row.line_item_id,
    reason: row.reason,
    customerComment: row.customer_comment,
    status: row.status,
    resolution: row.resolution,
    originalValue: Number(row.original_value),
    recoveredValue: Number(row.recovered_value),
    refundedValue: Number(row.refunded_value),
    negotiationId: row.negotiation_id ?? undefined,
    shippingLabelId: row.shipping_label_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------
// Negotiations
// ---------------------------------------------------------------
export async function createNegotiation(returnRequestId: string, merchantId: string): Promise<Negotiation> {
  const { rows } = await pool.query(
    `insert into negotiations (return_request_id, merchant_id) values ($1, $2) returning *`,
    [returnRequestId, merchantId],
  );
  return mapNegotiation(rows[0], []);
}

export async function getNegotiationWithMessages(id: string): Promise<Negotiation | null> {
  const { rows } = await pool.query(`select * from negotiations where id = $1`, [id]);
  if (rows.length === 0) return null;
  const messages = await getNegotiationMessages(id);
  return mapNegotiation(rows[0], messages);
}

export async function getNegotiationMessages(negotiationId: string): Promise<NegotiationMessage[]> {
  const { rows } = await pool.query(
    `select * from negotiation_messages where negotiation_id = $1 order by created_at asc`,
    [negotiationId],
  );
  return rows.map((r: any) => ({
    id: r.id,
    negotiationId: r.negotiation_id,
    role: r.role,
    content: r.content,
    createdAt: r.created_at,
    functionCall: r.function_call ?? undefined,
  }));
}

export async function addNegotiationMessage(input: {
  negotiationId: string;
  role: NegotiationMessage["role"];
  content: string;
  functionCall?: NegotiationMessage["functionCall"];
}): Promise<NegotiationMessage> {
  const { rows } = await pool.query(
    `insert into negotiation_messages (negotiation_id, role, content, function_call)
     values ($1, $2, $3, $4) returning *`,
    [input.negotiationId, input.role, input.content, input.functionCall ? JSON.stringify(input.functionCall) : null],
  );
  const r = rows[0];
  return {
    id: r.id,
    negotiationId: r.negotiation_id,
    role: r.role,
    content: r.content,
    createdAt: r.created_at,
    functionCall: r.function_call ?? undefined,
  };
}

export async function updateNegotiation(
  id: string,
  patch: Partial<{
    proposedVariantId: string;
    proposedUpsellVariantId: string;
    sentiment: Negotiation["sentiment"];
    status: Negotiation["status"];
  }>,
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const colMap: Record<string, string> = {
    proposedVariantId: "proposed_variant_id",
    proposedUpsellVariantId: "proposed_upsell_variant_id",
    sentiment: "sentiment",
    status: "status",
  };
  for (const [key, col] of Object.entries(colMap)) {
    const val = (patch as Record<string, unknown>)[key];
    if (val !== undefined) {
      fields.push(`${col} = $${i}`);
      values.push(val);
      i += 1;
    }
  }
  if (fields.length === 0) return;
  fields.push(`updated_at = now()`);
  values.push(id);
  await pool.query(`update negotiations set ${fields.join(", ")} where id = $${i}`, values);
}

function mapNegotiation(row: any, messages: NegotiationMessage[]): Negotiation {
  return {
    id: row.id,
    returnRequestId: row.return_request_id,
    merchantId: row.merchant_id,
    messages,
    proposedVariantId: row.proposed_variant_id ?? undefined,
    proposedUpsellVariantId: row.proposed_upsell_variant_id ?? undefined,
    sentiment: row.sentiment ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------
// Product variants (used by the negotiation engine + mock Shopify client)
// ---------------------------------------------------------------
export async function getVariant(id: string): Promise<ProductVariant | null> {
  const { rows } = await pool.query(`select * from product_variants where id = $1`, [id]);
  if (rows.length === 0) return null;
  return mapVariant(rows[0]);
}

export async function listVariantsForProduct(productId: string): Promise<ProductVariant[]> {
  const { rows } = await pool.query(`select * from product_variants where product_id = $1`, [productId]);
  return rows.map(mapVariant);
}

export async function findAlternativeVariants(
  merchantId: string,
  productId: string | null,
  excludeVariantId: string,
  limit = 5,
): Promise<ProductVariant[]> {
  // Alternatives for an exchange: prefer other in-stock variants of the
  // *same product* (e.g. a different size of the same jacket) — that's
  // what "exchange" means to a customer. Only fall back to other products
  // from the same merchant if the same product has nothing else in stock,
  // and rank same-product matches first either way.
  const { rows } = await pool.query(
    `select pv.*, (p.id = $2) as same_product from product_variants pv
     join products p on p.id = pv.product_id
     where p.merchant_id = $1 and pv.id != $3 and pv.inventory_quantity > 0
     order by same_product desc, pv.inventory_quantity desc
     limit $4`,
    [merchantId, productId, excludeVariantId, limit],
  );
  return rows.map(mapVariant);
}

function mapVariant(row: any): ProductVariant {
  return {
    id: row.id,
    shopifyVariantId: row.shopify_variant_id,
    title: row.title,
    price: Number(row.price),
    inventoryQuantity: row.inventory_quantity,
    sku: row.sku,
    imageUrl: row.image_url ?? undefined,
  };
}

// ---------------------------------------------------------------
// Shipping labels
// ---------------------------------------------------------------
export async function createShippingLabel(input: {
  returnRequestId: string;
  carrier: ShippingLabel["carrier"];
  trackingNumber: string;
  labelUrl: string;
  cost: number;
}): Promise<ShippingLabel> {
  const { rows } = await pool.query(
    `insert into shipping_labels (return_request_id, carrier, tracking_number, label_url, cost)
     values ($1, $2, $3, $4, $5) returning *`,
    [input.returnRequestId, input.carrier, input.trackingNumber, input.labelUrl, input.cost],
  );
  const r = rows[0];
  return {
    id: r.id,
    returnRequestId: r.return_request_id,
    carrier: r.carrier,
    trackingNumber: r.tracking_number,
    labelUrl: r.label_url,
    cost: Number(r.cost),
    createdAt: r.created_at,
  };
}

// ---------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------
export async function getRevenueSummary(merchantId: string, days = 30): Promise<RevenueSummary> {
  const { rows } = await pool.query(
    `select
       coalesce(sum(total_returns_started), 0) as total_returns_started,
       coalesce(sum(total_refunded_value), 0) as total_refunded_value,
       coalesce(sum(total_recovered_value), 0) as total_recovered_value,
       coalesce(sum(exchanges), 0) as exchanges,
       coalesce(sum(upsells), 0) as upsells,
       coalesce(sum(refunds), 0) as refunds
     from merchant_revenue_summary
     where merchant_id = $1 and day >= now() - ($2 || ' days')::interval`,
    [merchantId, days],
  );
  const r = rows[0];
  const refunded = Number(r.total_refunded_value);
  const recovered = Number(r.total_recovered_value);
  return {
    merchantId,
    periodStart: new Date(Date.now() - days * 86400000).toISOString(),
    periodEnd: new Date().toISOString(),
    totalReturnsStarted: Number(r.total_returns_started),
    totalRefundedValue: refunded,
    totalRecoveredValue: recovered,
    recoveryRate: recovered + refunded > 0 ? recovered / (recovered + refunded) : 0,
    exchanges: Number(r.exchanges),
    upsells: Number(r.upsells),
    refunds: Number(r.refunds),
  };
}
