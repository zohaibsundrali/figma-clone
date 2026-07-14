import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/file-access";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  stripeSessionId: z.string().min(1),
  plan: z.enum(["professional", "organization"]),
  screenshotDataUrl: z.string().startsWith("data:image/"),
  note: z.string().max(500).optional(),
});

// 3MB, matching the existing image-upload limit used elsewhere in the app
// (AssetsPanel) — base64 encoding inflates this by ~33%, so cap the encoded
// string a bit above 4MB to allow for that overhead.
const MAX_SCREENSHOT_LENGTH = 4_500_000;

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.screenshotDataUrl.length > MAX_SCREENSHOT_LENGTH) {
    return NextResponse.json({ error: "Screenshot is too large (max 3MB)." }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Contact the site owner." },
      { status: 503 }
    );
  }

  // Verify the Checkout Session actually belongs to this user and was paid —
  // never trust the client's claimed plan/session pairing on its own.
  const session = await stripe.checkout.sessions.retrieve(parsed.data.stripeSessionId);
  if (session.metadata?.userId !== userId) {
    return NextResponse.json({ error: "This checkout session doesn't belong to you." }, { status: 403 });
  }
  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "This checkout session hasn't been paid yet." }, { status: 400 });
  }

  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: parsed.data.plan,
      status: "pending_review",
      stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      stripeSubscriptionId,
      stripeSessionId: parsed.data.stripeSessionId,
      screenshotUrl: parsed.data.screenshotDataUrl,
      transactionNote: parsed.data.note ?? null,
    },
    update: {
      plan: parsed.data.plan,
      status: "pending_review",
      stripeSubscriptionId,
      stripeSessionId: parsed.data.stripeSessionId,
      screenshotUrl: parsed.data.screenshotDataUrl,
      transactionNote: parsed.data.note ?? null,
      // Clear any previous review decision — this is a fresh submission.
      reviewedByEmail: null,
      reviewedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
