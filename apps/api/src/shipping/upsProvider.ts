import axios from "axios";
import type { GenerateLabelInput, GeneratedLabel, ShippingProvider } from "./types";
import { config } from "../config";

/**
 * UPS Shipping API (sandbox: https://wwwcie.ups.com).
 * Docs: https://developer.ups.com/api/reference?loc=en_US#operation/Shipment
 *
 * Same caveat as the other two carrier providers — mirrors the documented
 * OAuth client-credentials flow + /shipments endpoint shape, not yet
 * exercised against a live sandbox account.
 */
export class UpsShippingProvider implements ShippingProvider {
  carrier = "ups" as const;
  private token: { value: string; expiresAt: number } | null = null;

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.value;
    const auth = Buffer.from(`${config.shipping.ups.clientId}:${config.shipping.ups.clientSecret}`).toString("base64");
    const res = await axios.post(
      "https://wwwcie.ups.com/security/v1/oauth/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" } },
    );
    this.token = { value: res.data.access_token, expiresAt: Date.now() + (Number(res.data.expires_in) - 60) * 1000 };
    return this.token.value;
  }

  async generateLabel(input: GenerateLabelInput): Promise<GeneratedLabel> {
    const token = await this.getAccessToken();
    const res = await axios.post(
      "https://wwwcie.ups.com/api/shipments/v1/ship",
      {
        ShipmentRequest: {
          Shipment: {
            Shipper: { Name: input.fromAddress.name, Address: toUpsAddress(input.fromAddress) },
            ShipTo: { Name: input.toAddress.name, Address: toUpsAddress(input.toAddress) },
            Package: [{ PackageWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: String(input.weightOz / 16) } }],
          },
          LabelSpecification: { LabelImageFormat: { Code: "PDF" } },
        },
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
    );

    const result = res.data.ShipmentResponse?.ShipmentResults;
    return {
      trackingNumber: result?.PackageResults?.TrackingNumber ?? "",
      labelUrl: result?.PackageResults?.ShippingLabel?.GraphicImage ?? "",
      cost: Number(result?.ShipmentCharges?.TotalCharges?.MonetaryValue ?? 0),
    };
  }
}

function toUpsAddress(addr: GenerateLabelInput["fromAddress"]) {
  return {
    AddressLine: [addr.line1],
    City: addr.city,
    StateProvinceCode: addr.state,
    PostalCode: addr.postalCode,
    CountryCode: addr.country,
  };
}
