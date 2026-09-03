import axios from "axios";
import type { GenerateLabelInput, GeneratedLabel, ShippingProvider } from "./types";
import { config } from "../config";

/**
 * DHL Express MyDHL API (sandbox: https://express.api.dhl.com/mydhlapi/test).
 * Docs: https://developer.dhl.com/api-reference/dhl-express-mydhl-api
 *
 * This posts a real `shipments` request shape. It's untested against a live
 * sandbox account (none was available while scaffolding this), so treat the
 * request/response mapping as a strong starting point to verify against real
 * DHL sandbox credentials, not as battle-tested code.
 */
export class DhlShippingProvider implements ShippingProvider {
  carrier = "dhl" as const;

  async generateLabel(input: GenerateLabelInput): Promise<GeneratedLabel> {
    const auth = Buffer.from(`${config.shipping.dhl.apiKey}:${config.shipping.dhl.apiSecret}`).toString("base64");
    const res = await axios.post(
      "https://express.api.dhl.com/mydhlapi/test/shipments",
      {
        plannedShippingDateAndTime: new Date().toISOString(),
        pickup: { isRequested: false },
        productCode: "N",
        accounts: [{ typeCode: "shipper", number: config.shipping.dhl.apiKey }],
        customerDetails: {
          shipperDetails: { postalAddress: toDhlAddress(input.fromAddress), contactInformation: { fullName: input.fromAddress.name } },
          receiverDetails: { postalAddress: toDhlAddress(input.toAddress), contactInformation: { fullName: input.toAddress.name } },
        },
        content: {
          packages: [{ weight: input.weightOz / 16, dimensions: { length: 20, width: 15, height: 10 } }],
          isCustomsDeclarable: false,
          description: "Retail return",
          unitOfMeasurement: "imperial",
        },
      },
      { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } },
    );

    return {
      trackingNumber: res.data.shipmentTrackingNumber,
      labelUrl: res.data.documents?.[0]?.url ?? "",
      cost: res.data.shipmentCharges?.[0]?.price ?? 0,
    };
  }
}

function toDhlAddress(addr: GenerateLabelInput["fromAddress"]) {
  return {
    addressLine1: addr.line1,
    cityName: addr.city,
    provinceCode: addr.state,
    postalCode: addr.postalCode,
    countryCode: addr.country,
  };
}
