import type { NegotiateRequest } from "@retainai/shared";
import * as db from "../db/queries";
import { negotiate } from "./aiClient";
import { getShopifyClient } from "../shopify/client";
import { getShippingProvider } from "../shipping";

export class NegotiationError extends Error {}

/**
 * Starts (or continues) the AI negotiation for a return request: persists
 * the customer's message, calls the AI Negotiator service with full
 * context (order line item + conversation history), persists the agent's
 * reply, and applies any lightweight state change the AI decided on
 * (proposing an exchange/upsell, or approving a plain refund outright).
 *
 * Actually *fulfilling* an accepted exchange/upsell (inventory adjustment +
 * label generation) happens in `acceptProposal` below, kept separate so the
 * merchant dashboard can show "customer accepted, finalizing..." as a
 * distinct step and so a customer can change their mind before it's final.
 */
export async function runNegotiationTurn(input: {
  returnRequestId: string;
  customerMessage: string;
}) {
  const returnRequest = await db.getReturnRequest(input.returnRequestId);
  if (!returnRequest) throw new NegotiationError("Return request not found");

  const orderInfo = await db.getOrderWithLineItem(returnRequest.lineItemId);
  if (!orderInfo) throw new NegotiationError("Order/line item not found for this return request");

  let negotiationId = returnRequest.negotiationId;
  if (!negotiationId) {
    const negotiation = await db.createNegotiation(returnRequest.id, returnRequest.merchantId);
    negotiationId = negotiation.id;
    await db.updateReturnRequest(returnRequest.id, { negotiationId, status: "negotiating" });
    await db.addNegotiationMessage({
      negotiationId,
      role: "system",
      content: `Return opened for "${orderInfo.lineItem.title}". Reason: ${returnRequest.reason}.`,
    });
  }

  await db.addNegotiationMessage({ negotiationId, role: "customer", content: input.customerMessage });
  const history = await db.getNegotiationMessages(negotiationId);

  const aiReq: NegotiateRequest = {
    merchantId: returnRequest.merchantId,
    returnRequestId: returnRequest.id,
    reason: returnRequest.reason,
    customerComment: returnRequest.customerComment,
    conversationHistory: history
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content })),
    order: { lineItem: orderInfo.lineItem },
  };

  const aiRes = await negotiate(aiReq);

  await db.addNegotiationMessage({
    negotiationId,
    role: "agent",
    content: aiRes.reply,
    functionCall: aiRes.functionCalls[0],
  });

  await db.updateNegotiation(negotiationId, { sentiment: aiRes.sentiment });

  if (aiRes.action.type === "propose_exchange") {
    await db.updateNegotiation(negotiationId, { proposedVariantId: aiRes.action.variantId });
  } else if (aiRes.action.type === "propose_upsell") {
    await db.updateNegotiation(negotiationId, { proposedUpsellVariantId: aiRes.action.variantId });
  } else if (aiRes.action.type === "approve_refund") {
    await db.updateReturnRequest(returnRequest.id, {
      status: "refund_approved",
      resolution: "refund",
      refundedValue: returnRequest.originalValue,
    });
    await db.updateNegotiation(negotiationId, { status: "resolved" });
  }

  return { negotiationId, aiResponse: aiRes };
}

/**
 * Finalizes a customer's acceptance of a proposed exchange or upsell:
 * adjusts inventory, marks the negotiation resolved, and kicks off return
 * label generation for the item being sent back.
 */
export async function acceptProposal(input: {
  returnRequestId: string;
  proposalType: "exchange" | "upsell";
}) {
  const returnRequest = await db.getReturnRequest(input.returnRequestId);
  if (!returnRequest) throw new NegotiationError("Return request not found");
  if (!returnRequest.negotiationId) throw new NegotiationError("No negotiation to accept");

  const negotiation = await db.getNegotiationWithMessages(returnRequest.negotiationId);
  if (!negotiation) throw new NegotiationError("Negotiation not found");

  const proposedVariantId =
    input.proposalType === "exchange" ? negotiation.proposedVariantId : negotiation.proposedUpsellVariantId;
  if (!proposedVariantId) throw new NegotiationError(`No proposed ${input.proposalType} variant on this negotiation`);

  const orderInfo = await db.getOrderWithLineItem(returnRequest.lineItemId);
  if (!orderInfo) throw new NegotiationError("Order/line item not found");

  const merchant = await db.getMerchantById(returnRequest.merchantId);
  if (!merchant) throw new NegotiationError("Merchant not found");

  const newVariant = await db.getVariant(proposedVariantId);
  if (!newVariant) throw new NegotiationError("Proposed variant no longer exists");

  const shopify = getShopifyClient(merchant.shopDomain, merchant.shopifyAccessToken);
  await shopify.adjustInventory(proposedVariantId, -1);
  await shopify.adjustInventory(orderInfo.lineItem.variantId!, +1);
  await shopify.applyOrderResolution({
    shopifyOrderId: orderInfo.order.shopifyOrderId,
    lineItemId: orderInfo.lineItem.shopifyLineItemId,
    resolution: input.proposalType,
    newVariantShopifyId: newVariant.shopifyVariantId,
  });

  const priceDelta = newVariant.price - orderInfo.lineItem.price;
  const recoveredValue = input.proposalType === "upsell" ? orderInfo.lineItem.price + Math.max(priceDelta, 0) : orderInfo.lineItem.price;

  await db.updateReturnRequest(returnRequest.id, {
    resolution: input.proposalType,
    recoveredValue,
    status: "label_generated",
  });
  await db.updateNegotiation(negotiation.id, { status: "resolved" });

  const provider = getShippingProvider("ups");
  const label = await provider.generateLabel({
    returnRequestId: returnRequest.id,
    carrier: "ups",
    fromAddress: {
      name: orderInfo.order.customerName ?? orderInfo.order.customerEmail,
      line1: "123 Customer St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "US",
    },
    toAddress: {
      name: merchant.shopDomain,
      line1: "1 Merchant Way",
      city: "Columbus",
      state: "OH",
      postalCode: "43215",
      country: "US",
    },
    weightOz: 16,
  });

  const savedLabel = await db.createShippingLabel({
    returnRequestId: returnRequest.id,
    carrier: label ? "ups" : "ups",
    trackingNumber: label.trackingNumber,
    labelUrl: label.labelUrl,
    cost: label.cost,
  });

  await db.updateReturnRequest(returnRequest.id, { shippingLabelId: savedLabel.id, status: "completed" });

  return { returnRequest: await db.getReturnRequest(returnRequest.id), label: savedLabel };
}
