import axios from "axios";
import type { GenerateLabelInput, GeneratedLabel, ShippingProvider } from "./types";
import { config } from "../config";

/**
 * FedEx Ship API (sandbox: https://apis-sandbox.fedex.com).
 * Docs: https://developer.fedex.com/api/en-us/catalog/ship/v1/docs.html
 *
 * Same caveat as the DHL provider: this mirrors FedEx's documented OAuth +
 * ship/v1/shipments request shape but has not been run against a live
 * sandbox account. Verify field names against current docs before going live.
 */
export class FedexShippingProvider implements ShippingProvider {
  carrier = "fedex" as const;
  private token: { value: string; expiresAt: number } | null = null;

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    const res = await axios.post(
      "https://apis-sandbox.fedex.com/oauth/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: config.shipping.fedex.clientId,
        client_secret: config.shipping.fedex.clientSecret,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    this.token = { value: res.data.access_token, expiresAt: Date.now() + (res.data.expires_in - 60) * 1000 };
    return this.token.value;
  }

  async generateLabel(input: GenerateLabelInput): Promise<GeneratedLabel> {
    const token = await this.getAccessToken();
    const res = await axios.post(
      "https://apis-sandbox.fedex.com/ship/v1/shipments",
      {
        labelResponseOptions: "URL_ONLY",
        requestedShipment: {
          shipper: { contact: { personName: input.fromAddress.name }, address: toFedexAddress(input.fromAddress) },
          recipients: [{ contact: { personName: input.toAddress.name }, address: toFedexAddress(input.toAddress) }],
          shipDatestamp: new Date().toISOString().slice(0, 10),
          serviceType: "FEDEX_GROUND",
          packagingType: "YOUR_PACKAGING",
          pickupType: "DROPOFF_AT_FEDEX_LOCATION",
          requestedPackageLineItems: [{ weight: { units: "LB", value: input.weightOz / 16 } }],
        },
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
    );

    const piece = res.data.output?.transactionShipments?.[0]?.pieceResponses?.[0];
    return {
      trackingNumber: piece?.trackingNumber ?? "",
      labelUrl: piece?.packageDocuments?.[0]?.url ?? "",
      cost: res.data.output?.transactionShipments?.[0]?.shipmentRating?.totalNetCharge ?? 0,
    };
  }
}

function toFedexAddress(addr: GenerateLabelInput["fromAddress"]) {
  return {
    streetLines: [addr.line1],
    city: addr.city,
    stateOrProvinceCode: addr.state,
    postalCode: addr.postalCode,
    countryCode: addr.country,
  };
}
