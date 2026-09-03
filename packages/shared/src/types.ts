// ============================================================
// RetainAI shared domain types
// Used by both apps/api (Node/TS) and apps/web (Next.js).
// The AI service (Python/FastAPI) mirrors these shapes in
// apps/ai-service/app/schemas.py — keep the two in sync.
// ============================================================

export type ReturnReason =
  | "wrong_size"
  | "wrong_color"
  | "changed_mind"
  | "defective"
  | "not_as_described"
  | "arrived_late"
  | "other";

export type ReturnStatus =
  | "requested"
  | "negotiating"
  | "exchange_accepted"
  | "upsell_accepted"
  | "refund_approved"
  | "label_generated"
  | "completed"
  | "cancelled";

export type ResolutionType = "exchange" | "upsell" | "refund" | "store_credit" | "none_yet";

export interface Merchant {
  id: string;
  shopDomain: string;
  shopifyAccessToken?: string | null;
  planTier: "starter" | "growth" | "scale";
  installedAt: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  shopifyProductId: string;
  title: string;
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  shopifyVariantId: string;
  title: string;
  price: number;
  inventoryQuantity: number;
  sku: string;
  imageUrl?: string;
}

export interface OrderLineItem {
  id: string;
  shopifyLineItemId: string;
  productId: string;
  variantId: string;
  title: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  shopifyOrderId: string;
  merchantId: string;
  customerEmail: string;
  customerName?: string;
  lineItems: OrderLineItem[];
  createdAt: string;
}

export interface NegotiationMessage {
  id: string;
  negotiationId: string;
  role: "customer" | "agent" | "system";
  content: string;
  createdAt: string;
  // Present when the agent turn included a Shopify/inventory function call.
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
    result?: Record<string, unknown>;
  };
}

export interface ReturnRequest {
  id: string;
  merchantId: string;
  orderId: string;
  lineItemId: string;
  reason: ReturnReason;
  customerComment?: string;
  status: ReturnStatus;
  resolution: ResolutionType;
  originalValue: number;
  recoveredValue: number; // 0 for a plain refund, > 0 for exchange/upsell
  refundedValue: number;
  negotiationId?: string;
  shippingLabelId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Negotiation {
  id: string;
  returnRequestId: string;
  merchantId: string;
  messages: NegotiationMessage[];
  proposedVariantId?: string;
  proposedUpsellVariantId?: string;
  sentiment?: "positive" | "neutral" | "frustrated" | "angry";
  status: "open" | "resolved" | "escalated";
  createdAt: string;
  updatedAt: string;
}

export type ShippingCarrier = "dhl" | "fedex" | "ups";

export interface ShippingLabel {
  id: string;
  returnRequestId: string;
  carrier: ShippingCarrier;
  trackingNumber: string;
  labelUrl: string;
  cost: number;
  createdAt: string;
}

// ---- Analytics ----

export interface RevenueSummary {
  merchantId: string;
  periodStart: string;
  periodEnd: string;
  totalReturnsStarted: number;
  totalRefundedValue: number;
  totalRecoveredValue: number; // exchanges + upsells
  recoveryRate: number; // recoveredValue / (recoveredValue + refundedValue)
  exchanges: number;
  upsells: number;
  refunds: number;
}

// ---- AI Negotiator contract (HTTP boundary between apps/api and apps/ai-service) ----

export interface NegotiateRequest {
  merchantId: string;
  returnRequestId: string;
  reason: ReturnReason;
  customerComment?: string;
  conversationHistory: Pick<NegotiationMessage, "role" | "content">[];
  order: {
    lineItem: OrderLineItem;
  };
}

export interface NegotiateResponse {
  reply: string;
  sentiment: "positive" | "neutral" | "frustrated" | "angry";
  action:
    | { type: "propose_exchange"; variantId: string; title: string; priceDelta: number }
    | { type: "propose_upsell"; variantId: string; title: string; priceDelta: number }
    | { type: "approve_refund" }
    | { type: "continue" };
  functionCalls: {
    name: string;
    arguments: Record<string, unknown>;
    result?: Record<string, unknown>;
  }[];
}
