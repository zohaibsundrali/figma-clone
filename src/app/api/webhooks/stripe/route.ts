import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Stripe webhooks need the raw request body for signature verification and
// must run on the Node runtime (the Stripe SDK isn't Edge-compatible).
export const runtime = "nodejs";

async function setStatusBySubscriptionId(stripeSubscriptionId: string, status: string) {
  await prisma.subscription
    .updateMany({ where: { stripeSubscriptionId }, data: { status } })
    .catch((err) => console.error("[stripe webhook] failed to update subscription status", err));
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    // A subscription's payment failed to renew — drop the user back to Free
    // until they fix their payment method (matches "miss a month, lose the plan").
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = getSubscriptionId(invoice);
      if (subId) await setStatusBySubscriptionId(subId, "past_due");
      break;
    }

    // A renewal succeeded after a prior failure — resume the already-approved
    // plan without requiring a fresh admin review.
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason === "subscription_cycle") {
        const subId = getSubscriptionId(invoice);
        if (subId) {
          await prisma.subscription
            .updateMany({
              where: { stripeSubscriptionId: subId, status: "past_due" },
              data: { status: "active" },
            })
            .catch((err) => console.error("[stripe webhook] failed to reactivate subscription", err));
        }
      }
      break;
    }

    // Subscription was canceled (by the user or after too many failed
    // charges) — drop back to Free.
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await setStatusBySubscriptionId(subscription.id, "canceled");
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

// Stripe's `Invoice.subscription` field was removed from the top-level type
// in newer API versions in favor of `parent.subscription_details.subscription`;
// check both so this keeps working regardless of which shape the SDK returns.
function getSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy?.id) return legacy.id;

  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;
  if (parentSub && "id" in parentSub) return parentSub.id;

  return null;
}
