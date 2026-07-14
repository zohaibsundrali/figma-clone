import Link from "next/link";

export const metadata = { title: "Privacy Policy — Figma Clone" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-xs text-muted hover:text-foreground">← Back home</Link>
        <h1 className="mt-4 text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-xs text-muted">Last updated: 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-muted">
          <section>
            <h2 className="text-sm font-semibold text-foreground">What we collect</h2>
            <p className="mt-1">
              Account details (name, email) via our authentication provider, the design files and
              content you create, and basic usage data needed to operate the product.
            </p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-foreground">Payment information</h2>
            <p className="mt-1">
              Payments are processed by Stripe — we never see or store your full card details.
              When you upgrade a plan, we store your subscription status and, temporarily, a
              screenshot you submit as payment proof for manual verification.
            </p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-foreground">How we use your data</h2>
            <p className="mt-1">
              To provide the service, verify payments, respond to support requests, and improve
              the product. We do not sell your data to third parties.
            </p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-foreground">Contact</h2>
            <p className="mt-1">
              Questions? Email{" "}
              <a href="mailto:cintrasoftwaresolutions@gmail.com" className="text-accent hover:underline">
                cintrasoftwaresolutions@gmail.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
