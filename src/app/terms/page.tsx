import Link from "next/link";

export const metadata = { title: "Terms of Service — Figma Clone" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-xs text-muted hover:text-foreground">← Back home</Link>
        <h1 className="mt-4 text-2xl font-bold">Terms of Service</h1>
        <p className="mt-1 text-xs text-muted">Last updated: 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-muted">
          <section>
            <h2 className="text-sm font-semibold text-foreground">Plans and billing</h2>
            <p className="mt-1">
              Free accounts are limited to 3 projects. Professional and Organization plans are
              billed monthly through Stripe and require admin verification of your payment before
              the plan activates. If a renewal payment fails or a subscription is canceled, your
              account reverts to the Free plan and its limits at the end of the current billing
              period.
            </p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-foreground">Your content</h2>
            <p className="mt-1">
              You retain ownership of everything you create. You're responsible for the content
              you upload and for keeping your account credentials secure.
            </p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-foreground">Acceptable use</h2>
            <p className="mt-1">
              Don't use the service to infringe on others' rights, distribute malicious content, or
              attempt to disrupt the platform for other users.
            </p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-foreground">Contact</h2>
            <p className="mt-1">
              Questions about these terms? Email{" "}
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
