import path from "path";
import dotenv from "dotenv";

// Load the repo-root .env regardless of the process's cwd (npm workspace
// scripts run with cwd=apps/api), then fall back to dotenv's normal
// cwd-relative lookup so an apps/api/.env still works if someone prefers
// per-app env files.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

function bool(mode: string | undefined, liveValue = "live"): boolean {
  return mode === liveValue;
}

export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54329/retainai",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",

  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY ?? "",
    apiSecret: process.env.SHOPIFY_API_SECRET ?? "",
    scopes: process.env.SHOPIFY_SCOPES ?? "read_orders,write_orders,read_inventory,write_inventory,read_products",
    appUrl: process.env.SHOPIFY_APP_URL ?? "http://localhost:3001",
    live: bool(process.env.SHOPIFY_MODE),
  },

  ai: {
    serviceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
    live: bool(process.env.AI_MODE),
  },

  shipping: {
    dhl: { live: bool(process.env.DHL_MODE), apiKey: process.env.DHL_API_KEY ?? "", apiSecret: process.env.DHL_API_SECRET ?? "" },
    fedex: { live: bool(process.env.FEDEX_MODE), clientId: process.env.FEDEX_CLIENT_ID ?? "", clientSecret: process.env.FEDEX_CLIENT_SECRET ?? "" },
    ups: { live: bool(process.env.UPS_MODE), clientId: process.env.UPS_CLIENT_ID ?? "", clientSecret: process.env.UPS_CLIENT_SECRET ?? "" },
  },
};
