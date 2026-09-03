import type { ShippingCarrier } from "@retainai/shared";

export interface GenerateLabelInput {
  returnRequestId: string;
  carrier: ShippingCarrier;
  fromAddress: Address;
  toAddress: Address;
  weightOz: number;
}

export interface Address {
  name: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface GeneratedLabel {
  trackingNumber: string;
  labelUrl: string;
  cost: number;
}

export interface ShippingProvider {
  carrier: ShippingCarrier;
  generateLabel(input: GenerateLabelInput): Promise<GeneratedLabel>;
}
