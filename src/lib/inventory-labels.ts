/** Display labels for inventory enums (admin UI). */
export const STATUS_LABELS: Record<string, string> = {
  available: "Available (warehouse)",
  consignment: "At distributor",
  sold: "Sold",
  written_off: "Written off",
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
