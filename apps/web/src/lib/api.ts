import type {
  MerchantSettings,
  Negotiation,
  NegotiateResponse,
  Order,
  OrderLineItem,
  ReturnRequest,
  RevenueSummary,
} from "@retainai/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getRevenueSummary: (merchantId: string) =>
    fetch(`${API_URL}/analytics/revenue-summary?merchantId=${merchantId}`, { cache: "no-store" }).then((r) =>
      json<RevenueSummary>(r),
    ),

  listReturns: (merchantId: string) =>
    fetch(`${API_URL}/returns?merchantId=${merchantId}`, { cache: "no-store" }).then((r) => json<ReturnRequest[]>(r)),

  getReturn: (id: string) =>
    fetch(`${API_URL}/returns/${id}`, { cache: "no-store" }).then((r) => json<ReturnRequest & { negotiation: Negotiation | null }>(r)),

  getLineItem: (lineItemId: string) =>
    fetch(`${API_URL}/line-items/${lineItemId}`, { cache: "no-store" }).then((r) => json<{ order: Order; lineItem: OrderLineItem }>(r)),

  getMerchantSettings: (merchantId: string) =>
    fetch(`${API_URL}/merchants/${merchantId}/settings`, { cache: "no-store" }).then((r) => json<MerchantSettings>(r)),

  createReturn: (input: { merchantId: string; lineItemId: string; reason: string; customerComment?: string }) =>
    fetch(`${API_URL}/returns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => json<ReturnRequest>(r)),

  sendMessage: (returnId: string, message: string) =>
    fetch(`${API_URL}/returns/${returnId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }).then((r) => json<{ negotiationId: string; aiResponse: NegotiateResponse }>(r)),

  acceptProposal: (returnId: string, proposalType: "exchange" | "upsell") =>
    fetch(`${API_URL}/returns/${returnId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalType }),
    }).then((r) => json<{ returnRequest: ReturnRequest; label: unknown }>(r)),
};

export const DEMO_MERCHANT_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_LINE_ITEM_ID = "51111111-1111-1111-1111-111111111111";
