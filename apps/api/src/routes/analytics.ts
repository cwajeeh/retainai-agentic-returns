import { Router } from "express";
import { getRevenueSummary } from "../db/queries";

export const analyticsRouter = Router();

analyticsRouter.get("/revenue-summary", async (req, res) => {
  const merchantId = String(req.query.merchantId ?? "");
  if (!merchantId) return res.status(400).json({ error: "merchantId query param required" });
  const days = req.query.days ? Number(req.query.days) : 30;
  const summary = await getRevenueSummary(merchantId, days);
  res.json(summary);
});
