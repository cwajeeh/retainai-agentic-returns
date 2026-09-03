import { Router, raw } from "express";
import crypto from "crypto";
import { config } from "../config";
import { pool } from "../db/pool";
import { getMerchantByShopDomain } from "../db/queries";

export const shopifyWebhookRouter = Router();

// Shopify webhooks must be verified against the *raw* request body, so this
// router uses express.raw() rather than the app-wide json() parser.
shopifyWebhookRouter.use(raw({ type: "application/json" }));

function verifyWebhookHmac(rawBody: Buffer, hmacHeader: string | undefined): boolean {
  if (!config.shopify.live) return true; // trust local/demo webhooks in mock mode
  if (!hmacHeader) return false;
  const digest = crypto.createHmac("sha256", config.shopify.apiSecret).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

shopifyWebhookRouter.post("/orders-create", async (req, res) => {
  if (!verifyWebhookHmac(req.body, req.get("X-Shopify-Hmac-Sha256"))) {
    return res.status(401).send("invalid hmac");
  }
  const shopDomain = req.get("X-Shopify-Shop-Domain");
  const payload = JSON.parse(req.body.toString("utf8"));

  const merchant = shopDomain ? await getMerchantByShopDomain(shopDomain) : null;
  if (!merchant) return res.status(200).send("ok"); // unknown shop, ignore quietly

  const orderRes = await pool.query(
    `insert into orders (merchant_id, shopify_order_id, customer_email, customer_name)
     values ($1, $2, $3, $4)
     on conflict (merchant_id, shopify_order_id) do update set customer_email = excluded.customer_email
     returning id`,
    [merchant.id, String(payload.id), payload.email ?? "unknown@example.com", payload.customer?.first_name ?? null],
  );
  const orderId = orderRes.rows[0].id;

  for (const li of payload.line_items ?? []) {
    await pool.query(
      `insert into order_line_items (order_id, shopify_line_item_id, title, quantity, price)
       values ($1, $2, $3, $4, $5)
       on conflict do nothing`,
      [orderId, String(li.id), li.title, li.quantity, li.price],
    );
  }

  res.status(200).send("ok");
});

shopifyWebhookRouter.post("/app-uninstalled", async (req, res) => {
  if (!verifyWebhookHmac(req.body, req.get("X-Shopify-Hmac-Sha256"))) {
    return res.status(401).send("invalid hmac");
  }
  const shopDomain = req.get("X-Shopify-Shop-Domain");
  if (shopDomain) {
    await pool.query(`update merchants set is_active = false where shop_domain = $1`, [shopDomain]);
  }
  res.status(200).send("ok");
});
