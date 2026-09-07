import { Router } from "express";
import { getOrderWithLineItem } from "../db/queries";

export const lineItemsRouter = Router();

// Lets the customer-facing return form show what's actually being returned
// (item title + price) instead of a bare form with no context.
lineItemsRouter.get("/:id", async (req, res) => {
  const info = await getOrderWithLineItem(req.params.id);
  if (!info) return res.status(404).json({ error: "Line item not found" });
  res.json(info);
});
