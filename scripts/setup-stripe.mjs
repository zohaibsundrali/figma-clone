// One-time setup: creates the "Professional" and "Organization" recurring
// Stripe Prices this app checks out against, so you don't have to click
// through the Stripe dashboard by hand.
//
// Usage: add STRIPE_SECRET_KEY to .env.local, then run:
//   node scripts/setup-stripe.mjs
// It prints the two Price IDs — paste them into .env.local as
// STRIPE_PRICE_PROFESSIONAL and STRIPE_PRICE_ORGANIZATION. Safe to re-run:
// it skips creating a plan whose Price ID is already set in .env.local.

import { config } from "dotenv";
import Stripe from "stripe";

config({ path: ".env.local" });
config({ path: ".env" });

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("STRIPE_SECRET_KEY is not set in .env.local — add it first, then re-run this script.");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const plans = [
  {
    envVar: "STRIPE_PRICE_PROFESSIONAL",
    productName: "Figma Clone — Professional",
    description: "Up to 10 projects, unlimited version history, priority support.",
    unitAmount: 1200, // $12.00
  },
  {
    envVar: "STRIPE_PRICE_ORGANIZATION",
    productName: "Figma Clone — Organization",
    description: "Unlimited projects, advanced security, dedicated support.",
    unitAmount: 4500, // $45.00
  },
];

for (const plan of plans) {
  if (process.env[plan.envVar]) {
    console.log(`Skipping ${plan.productName} — ${plan.envVar} is already set in .env.local.`);
    continue;
  }

  const product = await stripe.products.create({
    name: plan.productName,
    description: plan.description,
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: plan.unitAmount,
    recurring: { interval: "month" },
  });

  console.log(`\n${plan.productName}`);
  console.log(`  Product: ${product.id}`);
  console.log(`  Price:   ${price.id}`);
  console.log(`  → Add to .env.local:  ${plan.envVar}=${price.id}`);
}

console.log("\nDone. Also don't forget STRIPE_WEBHOOK_SECRET — create a webhook endpoint at");
console.log("https://dashboard.stripe.com/webhooks pointing to /api/webhooks/stripe");
console.log("(or run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for local testing).");
