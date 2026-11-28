/**
 * Profit-based pricing for made-to-order specimens. Pure — no I/O.
 *
 * Terms (kept distinct on purpose):
 *  - gross profit      = price − supplier cost
 *  - operating profit  = price − cost − handling − loss reserve − payment fee   (what MSC really keeps)
 *  - operating margin  = operating profit ÷ price
 * The payment fee is charged on the total INCLUDING sales tax, so it is modelled on price × (1 + tax).
 */
import { SITE } from "@/lib/site";

export interface PricingParams {
  /** Target operating margin, % of the selling price (e.g. 30). */
  marginPct: number;
  /** Minimum operating profit per specimen, CAD. */
  minProfit: number;
  /** Transport / packaging per specimen, CAD. */
  handlingCost: number;
  /** Reserve for losses, % of supplier cost. */
  lossReservePct: number;
  /** Card fee: variable part (e.g. 0.029) and fixed part in CAD (e.g. 0.30). */
  feePct: number;
  feeFixed: number;
  /** Prices are rounded UP to a multiple of this (CAD). */
  roundTo: number;
}

export const DEFAULT_PRICING: PricingParams = {
  marginPct: 30,
  minProfit: 12,
  handlingCost: 4,
  lossReservePct: 4,
  feePct: 0.029,
  feeFixed: 0.3,
  roundTo: 5,
};

export interface PriceBreakdown {
  price: number;
  grossProfit: number;
  operatingProfit: number;
  /** % of price. */
  operatingMarginPct: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** What MSC keeps at a given price. */
export function breakdownAt(price: number, cost: number, p: PricingParams): PriceBreakdown {
  const fee = p.feePct * (1 + SITE.taxRate) * price + p.feeFixed;
  const operatingProfit = price - cost - p.handlingCost - (p.lossReservePct / 100) * cost - fee;
  return {
    price: round2(price),
    grossProfit: round2(price - cost),
    operatingProfit: round2(operatingProfit),
    operatingMarginPct: price > 0 ? round2((operatingProfit / price) * 100) : 0,
  };
}

/** True when a price meets BOTH the margin target and the minimum profit. */
export function passesProfitGate(price: number, cost: number, p: PricingParams): boolean {
  const b = breakdownAt(price, cost, p);
  return b.operatingProfit >= p.minProfit - 1e-9 && b.operatingMarginPct >= p.marginPct - 1e-9;
}

/**
 * Smallest price (rounded up to `roundTo`) that meets the target operating margin AND the minimum
 * operating profit. Returns null when the margin target is unreachable (fees alone eat it).
 */
export function computeOfferPrice(cost: number, p: PricingParams): PriceBreakdown | null {
  if (!(cost >= 0)) return null;
  const k = 1 - p.feePct * (1 + SITE.taxRate); // share of the price left after the variable fee
  const m = p.marginPct / 100;
  if (k - m <= 0.01) return null;
  const fixed = cost * (1 + p.lossReservePct / 100) + p.handlingCost + p.feeFixed;
  const forMargin = fixed / (k - m);
  const forProfit = (p.minProfit + fixed) / k;
  const step = Math.max(0.01, p.roundTo);
  let price = Math.ceil(Math.max(forMargin, forProfit) / step) * step;
  // Rounding up can only help, but guard against float noise.
  while (!passesProfitGate(price, cost, p)) price += step;
  return breakdownAt(price, cost, p);
}
