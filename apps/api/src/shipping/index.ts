import type { ShippingCarrier } from "@retainai/shared";
import type { ShippingProvider } from "./types";
import { MockShippingProvider } from "./mockProvider";
import { DhlShippingProvider } from "./dhlProvider";
import { FedexShippingProvider } from "./fedexProvider";
import { UpsShippingProvider } from "./upsProvider";
import { config } from "../config";

export * from "./types";

export function getShippingProvider(carrier: ShippingCarrier): ShippingProvider {
  const liveByCarrier: Record<ShippingCarrier, boolean> = {
    dhl: config.shipping.dhl.live,
    fedex: config.shipping.fedex.live,
    ups: config.shipping.ups.live,
  };

  if (!liveByCarrier[carrier]) {
    return new MockShippingProvider(carrier);
  }

  switch (carrier) {
    case "dhl":
      return new DhlShippingProvider();
    case "fedex":
      return new FedexShippingProvider();
    case "ups":
      return new UpsShippingProvider();
  }
}
