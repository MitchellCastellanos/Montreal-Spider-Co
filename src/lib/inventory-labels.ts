/** Display labels for inventory enums (admin UI). Status ≠ location: a specimen can be Available at a partner store. */
export const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  /** @deprecated legacy status — new rows are always `available` + a partner location. */
  consignment: "Available (legacy partner)",
  allocated: "Allocated (paid order)",
  sold: "Sold",
  written_off: "Written off",
};

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  warehouse: "MSC warehouse",
  consignment: "Partner store",
  transit: "In transit",
};

export const CHANNEL_LABELS: Record<string, string> = {
  web: "Website",
  pickup_counter: "Pickup counter",
  kijiji: "Kijiji",
  marketplace: "Marketplace (FB, etc.)",
  distributor: "Distributor",
  event: "Event / show",
  wholesale: "Wholesale",
  other: "Other",
};

export const PAYMENT_LABELS: Record<string, string> = {
  stripe: "Stripe (card)",
  cash: "Cash",
  e_transfer: "E-transfer",
  other: "Other",
};

export const SALES_CHANNELS = Object.keys(CHANNEL_LABELS);
export const PAYMENT_METHODS = Object.keys(PAYMENT_LABELS);

/**
 * What we already stipulated for a specimen at a given sales channel — same
 * logic across the walk-in, audit and manual sale flows: distributor sales
 * default to the settlement price we agreed with the partner (falling back to
 * MSRP, then the listed price); every other channel just uses the listed price.
 */
export function suggestedSalePrice(
  s: { price: number; msrp: number | null; settlementPrice: number | null },
  channel: string,
): number {
  if (channel === "distributor") return s.settlementPrice ?? s.msrp ?? s.price;
  return s.price;
}
