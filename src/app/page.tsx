import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowRight, Check, CirclePlay, Grid2x2, Layers3, LayoutDashboard, ShieldCheck, Sparkles, Users } from "lucide-react";
import { redirect } from "next/navigation";

const features = [
  {
    icon: Users,
    title: "Real-time Collaboration",
    description:
      "Work together in the same file at the same time. See who is doing what in real-time, leave comments, and iterate faster than ever before.",
    span: "md:col-span-2",
  },
  {
    icon: Grid2x2,
    title: "Reusable Components",
    description:
      "Build once, use everywhere. Create a single source of truth for your design system.",
  },
  {
    icon: Sparkles,
    title: "Advanced Prototyping",
    description:
      "Bring your designs to life with smart animate, interactions, and realistic device frames.",
  },
  {
    icon: LayoutDashboard,
    title: "Auto Layout & Responsive",
    description:
      "Design fluidly. Elements stretch, fill, and hug their contents automatically, making responsive design an absolute breeze.",
    span: "md:col-span-2",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$0",
    subtitle: "/ forever",
    description: "Perfect for individuals and small teams starting out.",
    items: ["3 Figma files", "3 FigJam files", "Unlimited personal files"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$12",
    subtitle: "/ editor / month",
    description: "For teams that need a shared workspace and advanced features.",
    items: ["Unlimited Figma files", "Unlimited version history", "Shared and private projects", "Team libraries"],
    cta: "Choose Professional",
    highlighted: true,
  },
  {
    name: "Organization",
    price: "$45",
    subtitle: "/ editor / month",
    description: "For scaling organizations needing advanced security and control.",
    items: ["Everything in Pro", "Org-wide libraries", "Design system analytics", "SSO and advanced security"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h2>
      <p className="mt-2 text-sm text-foreground/65 md:text-base">{subtitle}</p>
    </div>
  );
}

function Mockup() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#252a32] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-[#2b3038] px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="bg-[#11151b] p-3 sm:p-4">
        <div className="rounded-[14px] border border-cyan-500/30 bg-[#171b22] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-4">
          <div className="grid min-h-80 grid-cols-[180px_minmax(0,1fr)_220px] gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#12161c] p-3 text-left max-md:grid-cols-1">
            <div className="rounded-xl border border-white/10 bg-[#181d24] p-3">
              <div className="mb-3 h-4 w-24 rounded bg-white/10" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-8 rounded-lg bg-white/5" />
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-cyan-400/25 bg-linear-to-br from-[#0d1117] via-[#111827] to-[#15151f] p-4">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-400/60 to-transparent" />
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="h-4 w-32 rounded bg-white/10" />
                  <div className="mt-2 h-3 w-48 rounded bg-white/5" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-8 rounded-full bg-white/10" />
                  <div className="h-8 w-8 rounded-full bg-white/10" />
                  <div className="h-8 rounded-lg bg-sky-500 px-3 text-xs font-medium text-white flex items-center">Share</div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2 rounded-2xl border border-cyan-400/25 bg-[#101923] p-4">
                  <div className="h-4 w-28 rounded bg-white/10" />
                  <div className="mt-4 h-40 rounded-xl bg-[linear-gradient(180deg,rgba(13,153,255,0.14),rgba(13,153,255,0.02))]">
                    <div className="flex h-full items-end gap-2 p-4">
                      {[34, 56, 42, 78, 64, 48, 90].map((h, index) => (
                        <div key={index} className="flex-1 rounded-t-md bg-sky-500/80" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#10161d] p-4">
                  <div className="h-4 w-20 rounded bg-white/10" />
                  <div className="mt-4 space-y-3">
                    {[1, 2, 3].map((index) => (
                      <div key={index} className="rounded-xl bg-white/5 p-3">
                        <div className="h-3 w-24 rounded bg-white/10" />
                        <div className="mt-2 h-2 w-full rounded bg-white/5" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#181d24] p-3 max-md:hidden">
              <div className="h-4 w-24 rounded bg-white/10" />
              <div className="mt-3 space-y-2">
                {[1, 2, 3, 4, 5].map((index) => (
                  <div key={index} className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                    <div className="h-2 w-2 rounded-full bg-sky-400" />
                    <div className="h-3 flex-1 rounded bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  // Safely check auth — if Clerk throws (e.g. invalid keys in dev),
  // still render the landing page instead of showing a 404.
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch {
    // Clerk misconfiguration — fall through to landing page
  }

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#0f141a] text-[#dfe2eb]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(13,153,255,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f141a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-semibold text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                <Layers3 className="h-4 w-4" />
              </div>
              <span>Figma Clone</span>
            </Link>
            <nav className="hidden gap-6 text-sm text-white/70 md:flex">
              <a href="#features" className="transition-colors hover:text-white">Features</a>
              <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
              <a href="#community" className="transition-colors hover:text-white">Community</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="hidden text-sm text-white/75 transition-colors hover:text-white sm:inline-flex">
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center rounded-md bg-sky-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(13,153,255,0.22),transparent_55%)]" />

        <div className="relative max-w-5xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1 text-xs font-medium text-sky-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Collaborative design editor MVP
          </p>
          <h1 className="mx-auto max-w-5xl text-5xl font-semibold tracking-tight text-white md:text-7xl md:leading-[0.95]">
            Design, prototype, and <span className="bg-linear-to-r from-[#9fcaff] to-[#0d99ff] bg-clip-text text-transparent">build together.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-white/70 md:text-xl md:leading-8">
            The collaborative interface design tool for teams to create, test, and ship better products faster.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
            >
              Start designing for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/8"
            >
              <CirclePlay className="h-4 w-4" />
              Watch video
            </Link>
          </div>
        </div>

        <div className="relative mt-14 w-full max-w-6xl">
          <div className="absolute inset-x-8 top-0 -z-10 h-24 rounded-full bg-sky-500/20 blur-3xl" />
          <Mockup />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <SectionHeading title="Everything you need to ship faster." subtitle="Powerful features wrapped in an intuitive interface." />

        <div className="mt-12 grid auto-rows-60 grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 ${feature.span ?? ""}`}
              >
                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
                <Icon className="relative h-7 w-7 text-sky-300" />
                <div className="relative mt-auto max-w-xl">
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">{feature.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="pricing" className="border-t border-white/10 bg-[#0d1117] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Simple, transparent pricing." subtitle="Start for free, upgrade when you need more power." />

          <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${plan.highlighted ? "border-sky-400 bg-[#111827] shadow-[0_0_0_1px_rgba(13,153,255,0.35),0_18px_60px_rgba(0,0,0,0.4)]" : "border-white/10 bg-white/3"}`}
              >
                {plan.highlighted && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-semibold ${plan.highlighted ? "text-sky-300" : "text-white"}`}>{plan.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-semibold text-white">{plan.price}</span>
                  <span className="pb-1 text-sm text-white/55">{plan.subtitle}</span>
                </div>
                <p className="mt-4 border-b border-white/10 pb-5 text-sm leading-6 text-white/65">{plan.description}</p>
                <ul className="mt-5 space-y-3 text-sm text-white/85">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className={`h-4 w-4 ${plan.highlighted ? "text-sky-300" : "text-sky-400"}`} />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link
                    href={plan.name === "Organization" ? "#" : "/sign-up"}
                    className={`flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors ${plan.highlighted ? "bg-sky-500 text-white hover:bg-sky-400" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer id="community" className="border-t border-white/10 bg-[#0a0e14] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-white/55 sm:px-6 lg:flex-row lg:px-8">
          <div className="flex items-center gap-2 text-white/90">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
              <Layers3 className="h-4 w-4" />
            </div>
            <span className="font-semibold">Figma Clone</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#" className="transition-colors hover:text-white">Privacy</a>
            <a href="#" className="transition-colors hover:text-white">Terms</a>
            <a href="#" className="transition-colors hover:text-white">Status</a>
            <a href="#" className="transition-colors hover:text-white">Support</a>
          </div>
          <p>© 2024 Figma Clone Inc. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
