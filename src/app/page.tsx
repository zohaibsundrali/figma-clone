import { auth } from "@clerk/nextjs/server";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Boxes,
  Building2,
  Check,
  CirclePlay,
  Component,
  CreditCard,
  Database,
  Download,
  FileCode,
  Gauge,
  Grid2x2,
  History,
  Keyboard,
  KeyRound,
  Layers,
  Layers3,
  LayoutDashboard,
  Mail,
  MessageSquare,
  MonitorSmartphone,
  Move,
  Palette,
  PenTool,
  Radio,
  Rocket,
  Rows3,
  ServerCog,
  Share2,
  ShieldCheck,
  Sparkles,
  Table2,
  Users,
  Zap,
} from "lucide-react";
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
    items: ["Up to 3 projects", "Core design tools", "Community support"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$12",
    subtitle: "/ editor / month",
    description: "For teams that need a shared workspace and advanced features.",
    items: ["Up to 10 projects", "Unlimited version history", "Shared and private projects", "Priority support"],
    cta: "Choose Professional",
    highlighted: true,
  },
  {
    name: "Organization",
    price: "$45",
    subtitle: "/ editor / month",
    description: "For scaling organizations needing advanced security and control.",
    items: ["Everything in Pro", "Org-wide libraries", "Design system analytics", "SSO and advanced security"],
    cta: "Get Organization",
    highlighted: false,
  },
];

const architectureServices = [
  { icon: Database, title: "PostgreSQL (Neon)", description: "Files, workspaces, comments — via Prisma ORM" },
  { icon: ShieldCheck, title: "Clerk", description: "Authentication & session management" },
  { icon: Zap, title: "Liveblocks", description: "Realtime presence & canvas sync" },
  { icon: CreditCard, title: "Stripe", description: "Subscription billing & payments" },
  { icon: Mail, title: "Resend", description: "Transactional email & invites" },
];

const techStack = [
  { icon: Layers3, name: "Next.js 16", role: "App Router framework" },
  { icon: Component, name: "React 19", role: "UI library" },
  { icon: FileCode, name: "TypeScript", role: "Type safety" },
  { icon: Palette, name: "Tailwind CSS", role: "Styling" },
  { icon: PenTool, name: "tldraw", role: "Canvas & shape engine" },
  { icon: ShieldCheck, name: "Clerk", role: "Authentication" },
  { icon: Zap, name: "Liveblocks", role: "Realtime collaboration" },
  { icon: Boxes, name: "Prisma", role: "Database ORM" },
  { icon: Database, name: "PostgreSQL (Neon)", role: "Primary database" },
  { icon: CreditCard, name: "Stripe", role: "Billing & payments" },
  { icon: Mail, name: "Resend", role: "Transactional email" },
];

const dataModels = [
  { name: "DesignFile", description: "Canvas data, sharing settings, thumbnails" },
  { name: "Workspace", description: "Team containers that group design files" },
  { name: "Comment", description: "Threaded canvas comments & reactions" },
  { name: "VersionHistory", description: "Named snapshots for restore" },
  { name: "Notification", description: "Mentions, replies & activity alerts" },
  { name: "Template", description: "Reusable starter designs" },
  { name: "Subscription", description: "Plan tier, billing & review status" },
];

// Detailed feature breakdown — every item here maps to a real, working part
// of this app (verified against the actual components/API routes), not
// aspirational copy.
const featureDetails = [
  {
    icon: KeyRound,
    title: "Users & Authentication",
    items: ["Email & password sign-in", "Google OAuth via Clerk", "Email verification", "Session management"],
  },
  {
    icon: Rows3,
    title: "Dashboard",
    items: ["Recent, shared & starred files", "Trash with restore", "File search", "Duplicate & delete"],
  },
  {
    icon: Radio,
    title: "Real-time Collaboration",
    items: ["Multiplayer editing", "Live cursors & presence", "Undo/redo for all", "Lock / unlock objects"],
  },
  {
    icon: Move,
    title: "Canvas & View",
    items: ["Infinite canvas", "Zoom & pan", "Mini map", "Grid, snap & smart guides"],
  },
  {
    icon: PenTool,
    title: "Drawing Tools",
    items: ["Select, Frame, Rectangle, Ellipse", "Line & Arrow", "Pen / freehand draw", "Text & Image"],
  },
  {
    icon: Palette,
    title: "Styling & Design",
    items: ["Fill color & stroke", "Corner radius & opacity", "Drop shadow effects", "Custom color picker"],
  },
  {
    icon: Layers,
    title: "Layers Panel",
    items: ["Reorder, lock & hide", "Bring to front / send to back", "Group / ungroup", "Nested pages"],
  },
  {
    icon: Component,
    title: "Components & Auto Layout",
    items: ["Master components & instances", "Auto layout containers", "Responsive constraints", "Design tokens"],
  },
  {
    icon: MessageSquare,
    title: "Comments & Chat",
    items: ["Pinned canvas comments", "@mentions", "Emoji reactions", "Resolve threads"],
  },
  {
    icon: History,
    title: "Version History",
    items: ["Auto & manual snapshots", "Named versions", "One-click restore", "Full audit trail"],
  },
  {
    icon: Building2,
    title: "Team Workspaces & Permissions",
    items: ["Shared workspaces", "Owner / editor / viewer roles", "Invite by email", "Per-file access control"],
  },
  {
    icon: Share2,
    title: "File Sharing",
    items: ["Public or private links", "Password-protected links", "Expiring links", "Role-based share access"],
  },
];

const perfAndSecurity = [
  "Route-level code splitting & lazy loading",
  "Server-side response caching",
  "Clerk-verified authentication on every request",
  "Bcrypt-hashed share-link passwords",
  "Zod-validated API inputs",
];

const keyboardShortcuts = [
  { keys: "V / H / F", action: "Select, hand, frame tools" },
  { keys: "R / O / L / A", action: "Rectangle, ellipse, line, arrow" },
  { keys: "T / P / I", action: "Text, pen, image" },
  { keys: "Ctrl + K", action: "Command palette" },
  { keys: "Ctrl + D", action: "Duplicate selection" },
  { keys: "Ctrl + Shift + A", action: "Arrange & align" },
];

const exportFormats = ["PNG", "SVG", "PDF", "JSON"];

const roadmap = [
  "Offline editing with background sync",
  "AI-assisted layout suggestions",
  "Design system analytics",
];

const folderStructure = [
  { path: "src/app/", note: "Routes, pages & API endpoints (App Router)" },
  { path: "src/components/", note: "editor/, dashboard/, auth/, ui/" },
  { path: "src/lib/", note: "Server helpers — auth, prisma, plans, stripe" },
  { path: "src/hooks/", note: "Shared React hooks" },
  { path: "src/types/", note: "Shared TypeScript types" },
  { path: "src/generated/", note: "Prisma client (auto-generated, not hand-written)" },
];

function Connector({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="h-6 w-px bg-linear-to-b from-sky-500/60 to-sky-500/10" />
      <ArrowDown className="h-4 w-4 text-sky-400" />
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/45">{label}</span>
    </div>
  );
}

function FeatureBox({
  icon: Icon,
  title,
  items,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-sky-400" />
        <h4 className="text-xs font-semibold text-white">{title}</h4>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5 text-[11px] leading-4 text-white/60">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-sky-500/70" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

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
              <a href="#tech-stack" className="transition-colors hover:text-white">Architecture</a>
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
              See how it works
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

      <section id="feature-details" className="border-t border-white/10 bg-[#0d1117] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Every tool, built in." subtitle="A closer look at what's under each feature." />

          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featureDetails.map((detail) => (
              <FeatureBox key={detail.title} icon={detail.icon} title={detail.title} items={detail.items} />
            ))}
          </div>
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
                    href={`/sign-up?plan=${plan.name === "Starter" ? "free" : plan.name.toLowerCase()}`}
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

      <section id="tech-stack" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <SectionHeading title="Technology Stack" subtitle="The real tools this app is built and run on." />

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {techStack.map((tech) => {
            const Icon = tech.icon;
            return (
              <div
                key={tech.name}
                className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4"
              >
                <Icon className="h-5 w-5 text-sky-400" />
                <h4 className="mt-2.5 text-xs font-semibold text-white">{tech.name}</h4>
                <p className="mt-1 text-[11px] leading-4 text-white/55">{tech.role}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="data-model" className="border-t border-white/10 bg-[#0d1117] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Data Model" subtitle="Core database tables, managed with Prisma + PostgreSQL." />

          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dataModels.map((model) => (
              <div key={model.name} className="rounded-xl border border-white/10 bg-white/3 p-4">
                <Table2 className="h-5 w-5 text-sky-400" />
                <h4 className="mt-2.5 font-mono text-xs font-semibold text-white">{model.name}</h4>
                <p className="mt-1 text-[11px] leading-4 text-white/55">{model.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="architecture" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <SectionHeading
          title="Project Architecture"
          subtitle="How the client, real-time layer, and backend services fit together."
        />

        <div className="mx-auto mt-12 flex max-w-md flex-col items-center">
          {/* Client layer */}
          <div className="w-full rounded-2xl border border-sky-400/30 bg-[linear-gradient(180deg,rgba(13,153,255,0.12),rgba(13,153,255,0.02))] p-5 text-center shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
            <MonitorSmartphone className="mx-auto h-6 w-6 text-sky-300" />
            <h3 className="mt-3 text-sm font-semibold text-white">Browser Client</h3>
            <p className="mt-1 text-xs leading-5 text-white/60">
              Next.js 16 + React 19 UI, rendered with the tldraw canvas engine and Tailwind
            </p>
          </div>

          <Connector label="HTTPS / Server Actions" />

          {/* Application layer */}
          <div className="w-full rounded-2xl border border-white/10 bg-white/3 p-5 text-center">
            <ServerCog className="mx-auto h-6 w-6 text-sky-300" />
            <h3 className="mt-3 text-sm font-semibold text-white">Next.js Server</h3>
            <p className="mt-1 text-xs leading-5 text-white/60">
              API routes, middleware auth checks, and server components
            </p>
          </div>

          <Connector label="Data & Integrations" />

          {/* Services layer */}
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {architectureServices.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 text-center"
                >
                  <Icon className="mx-auto h-5 w-5 text-sky-400" />
                  <h4 className="mt-2 text-xs font-semibold text-white">{service.title}</h4>
                  <p className="mt-1 text-[11px] leading-4 text-white/55">{service.description}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-6 max-w-lg text-center text-xs leading-5 text-white/45">
            The canvas itself syncs peer-to-peer through a direct WebSocket connection to
            Liveblocks — collaborators see each other&apos;s edits without a round trip through
            the app server.
          </p>
        </div>
      </section>

      {/* Folder Structure section — temporarily disabled, keep for easy restore
      <section id="folder-structure" className="border-t border-white/10 bg-[#0d1117] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Folder Structure" subtitle="How the codebase is organized, top to bottom." />

          <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-[18px] border border-white/10 bg-[#252a32] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-[#2b3038] px-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="space-y-2.5 bg-[#11151b] p-5 sm:p-6">
              {folderStructure.map((entry) => (
                <div key={entry.path} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
                  <span className="shrink-0 font-mono text-xs font-semibold text-sky-300">{entry.path}</span>
                  <span className="text-[11px] text-white/50">{entry.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      */}

      <section id="performance" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Performance & Security</h3>
            </div>
            <ul className="mt-4 space-y-2">
              {perfAndSecurity.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs leading-5 text-white/65">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500/70" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
            </div>
            <ul className="mt-4 space-y-2.5">
              {keyboardShortcuts.map((sc) => (
                <li key={sc.keys} className="flex items-center justify-between gap-3 text-xs text-white/65">
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-sky-300">
                    {sc.keys}
                  </span>
                  <span className="text-right">{sc.action}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Export Options</h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {exportFormats.map((format) => (
                <div
                  key={format}
                  className="rounded-lg border border-white/10 bg-white/5 py-3 text-center text-xs font-semibold text-sky-300"
                >
                  {format}
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-sky-400" />
              <h4 className="text-xs font-semibold text-white">On the roadmap</h4>
            </div>
            <ul className="mt-2 space-y-1.5">
              {roadmap.map((item) => (
                <li key={item} className="text-[11px] leading-4 text-white/45">— {item}</li>
              ))}
            </ul>
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
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
            <a href="mailto:cintrasoftwaresolutions@gmail.com" className="transition-colors hover:text-white">Support</a>
          </div>
          <p>© 2024 Figma Clone Inc. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
