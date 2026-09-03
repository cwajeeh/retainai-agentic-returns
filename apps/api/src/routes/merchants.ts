import { Router } from "express";
import { getMerchantById } from "../db/queries";

export const merchantsRouter = Router();

merchantsRouter.get("/:id", async (req, res) => {
  const merchant = await getMerchantById(req.params.id);
  if (!merchant) return res.status(404).json({ error: "Not found" });
  res.json(merchant);
});
