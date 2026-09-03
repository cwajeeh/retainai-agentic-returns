import { Router } from "express";
import crypto from "crypto";
import axios from "axios";
import { config } from "../config";
import { upsertMerchant } from "../db/queries";

export const shopifyOAuthRouter = Router();

/**
 * Step 1 of Shopify OAuth: redirect the merchant to Shopify's consent
 * screen. GET /auth/shopify?shop=my-store.myshopify.com
 */
shopifyOAuthRouter.get("/shopify", (req, res) => {
  const shop = String(req.query.shop ?? "");
  if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shop)) {
    return res.status(400).json({ error: "Invalid or missing ?shop= parameter" });
  }

  if (!config.shopify.live) {
    return res.status(200).json({
      message:
        "SHOPIFY_MODE=mock — no real OAuth to perform. Set SHOPIFY_MODE=live and SHOPIFY_API_KEY/SECRET to enable real installs.",
      shop,
    });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${config.shopify.appUrl}/auth/shopify/callback`;
  const installUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${config.shopify.apiKey}` +
    `&scope=${encodeURIComponent(config.shopify.scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  // In production, persist `state` (signed cookie or server-side store) and
  // verify it in the callback below before exchanging the code.
  res.redirect(installUrl);
});

/**
 * Step 2: Shopify redirects back here with a code we exchange for a
 * permanent access token.
 */
shopifyOAuthRouter.get("/shopify/callback", async (req, res) => {
  const { shop, code, hmac } = req.query as Record<string, string>;
  if (!shop || !code) {
    return res.status(400).json({ error: "Missing shop or code" });
  }

  if (hmac && !verifyHmac(req.query as Record<string, string>)) {
    return res.status(401).json({ error: "HMAC validation failed" });
  }

  try {
    const tokenRes = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: config.shopify.apiKey,
      client_secret: config.shopify.apiSecret,
      code,
    });
    const accessToken = tokenRes.data.access_token as string;
    const merchant = await upsertMerchant(shop, accessToken);
    res.redirect(`${config.shopify.appUrl.replace(/:3001$/, ":3000")}/dashboard?merchantId=${merchant.id}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Shopify OAuth token exchange failed", err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

function verifyHmac(query: Record<string, string>): boolean {
  const { hmac, ...rest } = query;
  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("&");
  const digest = crypto.createHmac("sha256", config.shopify.apiSecret).update(message).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
  } catch {
    return false;
  }
}
