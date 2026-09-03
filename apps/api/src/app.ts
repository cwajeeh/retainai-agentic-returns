import express from "express";
import cors from "cors";
import { shopifyOAuthRouter } from "./shopify/oauth";
import { shopifyWebhookRouter } from "./shopify/webhooks";
import { returnsRouter } from "./routes/returns";
import { analyticsRouter } from "./routes/analytics";
import { merchantsRouter } from "./routes/merchants";
import { errorHandler } from "./middleware/errorHandler";

/** Builds the Express app. Shared by the local/container entrypoint
 * (src/index.ts) and the AWS Lambda entrypoint (src/lambda.ts) so the two
 * deployment targets can never drift apart. */
export function createApp() {
  const app = express();

  app.use(cors());

  // Webhook router registers its own express.raw() body parser internally
  // and must be mounted before the app-wide json() parser below.
  app.use("/webhooks/shopify", shopifyWebhookRouter);

  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true, service: "retainai-api" }));

  app.use("/auth", shopifyOAuthRouter);
  app.use("/returns", returnsRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/merchants", merchantsRouter);

  app.use(errorHandler);

  return app;
}
