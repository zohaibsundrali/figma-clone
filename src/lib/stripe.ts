import Stripe from "stripe";

let cached: Stripe | null | undefined;

/**
 * Returns the Stripe client, or null if STRIPE_SECRET_KEY isn't configured
 * yet. Every caller must handle the null case gracefully (respond with a
 * clear "payments not configured" error) rather than throwing — this app
 * must keep working before Stripe keys are added.
 */
export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}
