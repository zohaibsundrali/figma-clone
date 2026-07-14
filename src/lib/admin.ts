/**
 * Site-wide admin allowlist, driven entirely by the ADMIN_EMAILS env var
 * (comma-separated). There's no admin role in the database — this app has
 * no concept of a site-wide admin beyond this list, only per-file/per-
 * workspace roles (see FileMember/WorkspaceMember). Keep it that way unless
 * multiple admins with distinct permissions are actually needed.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
