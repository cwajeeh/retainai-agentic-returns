import type { GenerateLabelInput, GeneratedLabel, ShippingProvider } from "./types";
import type { ShippingCarrier } from "@retainai/shared";
import { randomUUID } from "crypto";

/** Deterministic fake label generator — used whenever a carrier's *_MODE env var is not "live". */
export class MockShippingProvider implements ShippingProvider {
  constructor(public readonly carrier: ShippingCarrier) {}

  async generateLabel(input: GenerateLabelInput): Promise<GeneratedLabel> {
    const trackingNumber = `${this.carrier.toUpperCase()}-MOCK-${randomUUID().slice(0, 10).toUpperCase()}`;
    return {
      trackingNumber,
      labelUrl: `https://labels.retainai.mock/${this.carrier}/${trackingNumber}.pdf`,
      cost: estimateCost(this.carrier, input.weightOz),
    };
  }
}

function estimateCost(carrier: ShippingCarrier, weightOz: number): number {
  const base = { dhl: 6.5, fedex: 7.25, ups: 6.9 }[carrier];
  return Math.round((base + weightOz * 0.08) * 100) / 100;
}
