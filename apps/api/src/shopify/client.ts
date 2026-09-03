import type { ProductVariant } from "@retainai/shared";
import { config } from "../config";
import { pool } from "../db/pool";
import axios from "axios";

/**
 * Every read/write RetainAI needs to make against a merchant's Shopify
 * store goes through this interface. In `mock` mode it reads/writes the
 * local Postgres product_variants table seeded in packages/db/seed —
 * good enough to demo the full negotiation -> exchange -> label loop
 * without a real Partner account. In `live` mode it calls the Shopify
 * Admin GraphQL API with the merchant's stored access token.
 */
export interface ShopifyClient {
  getVariantInventory(variantId: string): Promise<number>;
  adjustInventory(variantId: string, delta: number): Promise<void>;
  /** Records the resolution on the Shopify order (exchange line item swap / refund). Best-effort in mock mode. */
  applyOrderResolution(input: {
    shopifyOrderId: string;
    lineItemId: string;
    resolution: "exchange" | "upsell" | "refund" | "store_credit";
    newVariantShopifyId?: string;
    refundAmount?: number;
  }): Promise<void>;
}

class MockShopifyClient implements ShopifyClient {
  async getVariantInventory(variantId: string): Promise<number> {
    const { rows } = await pool.query(`select inventory_quantity from product_variants where id = $1`, [variantId]);
    return rows[0]?.inventory_quantity ?? 0;
  }

  async adjustInventory(variantId: string, delta: number): Promise<void> {
    await pool.query(
      `update product_variants set inventory_quantity = greatest(0, inventory_quantity + $1) where id = $2`,
      [delta, variantId],
    );
  }

  async applyOrderResolution(input: Parameters<ShopifyClient["applyOrderResolution"]>[0]): Promise<void> {
    // eslint-disable-next-line no-console
    console.log("[mock-shopify] would apply order resolution:", input);
  }
}

class LiveShopifyClient implements ShopifyClient {
  constructor(private readonly shopDomain: string, private readonly accessToken: string) {}

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await axios.post(
      `https://${this.shopDomain}/admin/api/2024-10/graphql.json`,
      { query, variables },
      { headers: { "X-Shopify-Access-Token": this.accessToken, "Content-Type": "application/json" } },
    );
    if (res.data.errors) {
      throw new Error(`Shopify GraphQL error: ${JSON.stringify(res.data.errors)}`);
    }
    return res.data.data as T;
  }

  async getVariantInventory(variantId: string): Promise<number> {
    const data = await this.graphql<{ productVariant: { inventoryQuantity: number } }>(
      `query($id: ID!) { productVariant(id: $id) { inventoryQuantity } }`,
      { id: variantId },
    );
    return data.productVariant?.inventoryQuantity ?? 0;
  }

  async adjustInventory(_variantId: string, _delta: number): Promise<void> {
    // Requires inventoryItemId + locationId resolution + inventoryAdjustQuantities
    // mutation. Left as an integration point: wire this up once a real
    // Partner app + dev store is available to test against.
    throw new Error("LiveShopifyClient.adjustInventory not yet wired — see comment for the mutation to implement.");
  }

  async applyOrderResolution(input: Parameters<ShopifyClient["applyOrderResolution"]>[0]): Promise<void> {
    // Exchanges: use the Shopify `orderEditBegin` / `orderEditAddVariant` /
    // `orderEditCommit` mutations. Refunds: use `refundCreate`. Both are
    // real, documented Admin API mutations — stubbed here pending live
    // credentials to test against.
    // eslint-disable-next-line no-console
    console.log("[live-shopify] applyOrderResolution not yet implemented, received:", input);
  }
}

export function getShopifyClient(shopDomain: string, accessToken?: string | null): ShopifyClient {
  if (config.shopify.live && accessToken) {
    return new LiveShopifyClient(shopDomain, accessToken);
  }
  return new MockShopifyClient();
}

export async function getAlternatives(
  _merchantId: string,
  _productId: string | null,
  _excludeVariantId: string,
): Promise<ProductVariant[]> {
  // Thin re-export point kept here so route handlers only ever import
  // from `shopify/client` rather than reaching into db/queries directly.
  const { findAlternativeVariants } = await import("../db/queries");
  return findAlternativeVariants(_merchantId, _productId, _excludeVariantId);
}
