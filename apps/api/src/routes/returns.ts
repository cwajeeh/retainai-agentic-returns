import { Router } from "express";
import { z } from "zod";
import * as db from "../db/queries";
import { runNegotiationTurn, acceptProposal, NegotiationError } from "../services/negotiationEngine";

export const returnsRouter = Router();

const createReturnSchema = z.object({
  merchantId: z.string().uuid(),
  lineItemId: z.string().uuid(),
  reason: z.enum(["wrong_size", "wrong_color", "changed_mind", "defective", "not_as_described", "arrived_late", "other"]),
  customerComment: z.string().optional(),
});

returnsRouter.post("/", async (req, res) => {
  const parsed = createReturnSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const orderInfo = await db.getOrderWithLineItem(parsed.data.lineItemId);
  if (!orderInfo) return res.status(404).json({ error: "Line item not found" });

  const returnRequest = await db.createReturnRequest({
    merchantId: parsed.data.merchantId,
    orderId: orderInfo.order.id,
    lineItemId: parsed.data.lineItemId,
    reason: parsed.data.reason,
    customerComment: parsed.data.customerComment,
    originalValue: orderInfo.lineItem.price * orderInfo.lineItem.quantity,
  });

  res.status(201).json(returnRequest);
});

returnsRouter.get("/", async (req, res) => {
  const merchantId = String(req.query.merchantId ?? "");
  if (!merchantId) return res.status(400).json({ error: "merchantId query param required" });
  const returns = await db.listReturnRequests(merchantId);
  res.json(returns);
});

returnsRouter.get("/:id", async (req, res) => {
  const returnRequest = await db.getReturnRequest(req.params.id);
  if (!returnRequest) return res.status(404).json({ error: "Not found" });
  const negotiation = returnRequest.negotiationId ? await db.getNegotiationWithMessages(returnRequest.negotiationId) : null;
  res.json({ ...returnRequest, negotiation });
});

const messageSchema = z.object({ message: z.string().min(1) });

returnsRouter.post("/:id/messages", async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await runNegotiationTurn({ returnRequestId: req.params.id, customerMessage: parsed.data.message });
    res.json(result);
  } catch (err) {
    if (err instanceof NegotiationError) return res.status(400).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Negotiation turn failed" });
  }
});

const acceptSchema = z.object({ proposalType: z.enum(["exchange", "upsell"]) });

returnsRouter.post("/:id/accept", async (req, res) => {
  const parsed = acceptSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await acceptProposal({ returnRequestId: req.params.id, proposalType: parsed.data.proposalType });
    res.json(result);
  } catch (err) {
    if (err instanceof NegotiationError) return res.status(400).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Failed to finalize proposal" });
  }
});
