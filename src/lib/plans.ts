// Single source of truth for plan definitions — used by the pricing page,
// the checkout API, and project-limit enforcement so they never drift.
export type PlanId = "free" | "professional" | "organization";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceSubtitle: string;
  description: string;
  projectLimit: number; // Infinity for unlimited
  features: string[];
  /** Name of the env var holding this plan's Stripe Price ID. Free has none. */
  stripePriceEnvVar?: "STRIPE_PRICE_PROFESSIONAL" | "STRIPE_PRICE_ORGANIZATION";
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    priceSubtitle: "/ forever",
    description: "Perfect for individuals and small teams starting out.",
    projectLimit: 3,
    features: ["Up to 3 projects", "Core design tools", "Community support"],
  },
  professional: {
    id: "professional",
    name: "Professional",
    priceLabel: "$12",
    priceSubtitle: "/ editor / month",
    description: "For teams that need a shared workspace and advanced features.",
    projectLimit: 10,
    features: ["Up to 10 projects", "Version history", "Priority support"],
    stripePriceEnvVar: "STRIPE_PRICE_PROFESSIONAL",
  },
  organization: {
    id: "organization",
    name: "Organization",
    priceLabel: "$45",
    priceSubtitle: "/ editor / month",
    description: "For scaling organizations needing advanced security and control.",
    projectLimit: Infinity,
    features: ["Unlimited projects", "Advanced security", "Dedicated support"],
    stripePriceEnvVar: "STRIPE_PRICE_ORGANIZATION",
  },
};

export function getPlan(id: string | null | undefined): PlanDefinition {
  if (id === "professional" || id === "organization") return PLANS[id];
  return PLANS.free;
}
