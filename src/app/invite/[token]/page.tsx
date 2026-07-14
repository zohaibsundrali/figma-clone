import { InviteAcceptClient } from "./InviteAcceptClient";

type PageProps = {
  params: Promise<{ token: string }>;
};

// This route is NOT in the public matcher in src/proxy.ts, so Clerk middleware
// forces sign-in first and returns here afterwards — completing access for new
// users once they have an account.
export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  return <InviteAcceptClient token={token} />;
}
