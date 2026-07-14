import { prisma } from "./prisma";
import { getPlan, type PlanDefinition } from "./plans";

/**
 * The plan a user is actually entitled to right now.
 *
 * A Subscription row only grants its `plan` when `status === "active"`
 * (i.e. an admin has approved the payment screenshot). While a payment is
 * pending review, or after it's rejected/canceled/past_due, the user's
 * effective plan is Free — matching the "admin must approve before the plan
 * activates, and missing a monthly payment drops you back to Free" rules.
 */
export async function getEffectivePlan(userId: string): Promise<PlanDefinition> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || sub.status !== "active") return getPlan("free");
  return getPlan(sub.plan);
}

export async function getUserProjectCount(userId: string): Promise<number> {
  return prisma.designFile.count({
    where: { ownerId: userId, isDeleted: false },
  });
}

export interface ProjectLimitCheck {
  allowed: boolean;
  plan: PlanDefinition;
  used: number;
}

export async function checkProjectLimit(userId: string): Promise<ProjectLimitCheck> {
  const [plan, used] = await Promise.all([
    getEffectivePlan(userId),
    getUserProjectCount(userId),
  ]);
  return { allowed: used < plan.projectLimit, plan, used };
}
