import "server-only";
import Stripe from "stripe";

/** True when both server and publishable Stripe keys are set. */
export const stripeConfigured = Boolean(
  process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
);

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  if (!_stripe) {
    _stripe = new Stripe(key);
  }
  return _stripe;
}
