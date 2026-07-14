import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserContext } from "@/lib/file-access";
import { getStripe } from "@/lib/stripe";
import { getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  plan: z.enum(["professional", "organization"]),
});

export async function POST(request: Request) {
  const me = await getCurrentUserContext();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Contact the site owner." },
      { status: 503 }
    );
  }

  const plan = getPlan(parsed.data.plan);
  const priceId = plan.stripePriceEnvVar ? process.env[plan.stripePriceEnvVar] : null;
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price for the ${plan.name} plan is not configured yet.` },
      { status: 503 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Reuse a Stripe customer across checkout attempts instead of creating a
  // fresh one every time.
  const existing = await prisma.subscription.findUnique({ where: { userId: me.userId } });
  let customerId = existing?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: me.email ?? undefined,
      name: me.name,
      metadata: { userId: me.userId },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/pricing/confirm?session_id={CHECKOUT_SESSION_ID}&plan=${plan.id}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { userId: me.userId, plan: plan.id },
  });

  // Track the customer id immediately so a retried checkout reuses it even
  // if the user never completes this session.
  await prisma.subscription.upsert({
    where: { userId: me.userId },
    create: { userId: me.userId, stripeCustomerId: customerId },
    update: { stripeCustomerId: customerId },
  });

  return NextResponse.json({ url: session.url });
}
