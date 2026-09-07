import { Router } from "express";
import { getMerchantById } from "../db/queries";
import { config } from "../config";
import type { MerchantSettings } from "@retainai/shared";

export const merchantsRouter = Router();

merchantsRouter.get("/:id", async (req, res) => {
  const merchant = await getMerchantById(req.params.id);
  if (!merchant) return res.status(404).json({ error: "Not found" });
  res.json(merchant);
});

// Read-only view of which integrations are running against real providers
// vs. this project's built-in mocks. Mirrors the *_MODE env vars in
// apps/api/src/config.ts — never exposes API keys/secrets, only mode flags.
merchantsRouter.get("/:id/settings", async (req, res) => {
  const merchant = await getMerchantById(req.params.id);
  if (!merchant) return res.status(404).json({ error: "Not found" });

  const settings: MerchantSettings = {
    merchant,
    integrations: {
      shopify: { mode: config.shopify.live ? "live" : "mock" },
      ai: { mode: config.ai.live ? "live" : "mock" },
      shipping: {
        dhl: { mode: config.shipping.dhl.live ? "live" : "mock" },
        fedex: { mode: config.shipping.fedex.live ? "live" : "mock" },
        ups: { mode: config.shipping.ups.live ? "live" : "mock" },
      },
    },
  };
  res.json(settings);
});
