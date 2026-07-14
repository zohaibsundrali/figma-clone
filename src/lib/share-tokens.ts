import { randomBytes, createHmac, timingSafeEqual } from "crypto";

/**
 * Secret used to sign verified-share session cookies. Falls back to the
 * Liveblocks secret so the app works without extra config, but a dedicated
 * SHARE_SESSION_SECRET is recommended in production.
 */
function sessionSecret(): string {
  const secret =
    process.env.SHARE_SESSION_SECRET || process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "SHARE_SESSION_SECRET (or LIVEBLOCKS_SECRET_KEY) is required to sign share sessions."
    );
  }
  return secret;
}

/** Cryptographically-secure, URL-safe token for share links / invitations. */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Per-file cookie name so several password-protected links can be open at once. */
export function shareCookieName(fileId: string): string {
  return `share_session_${fileId}`;
}
/** Verified-share sessions are short-lived. */
export const SHARE_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Build a signed session value proving the bearer entered the correct password
 * for `fileId`, valid until `exp`. Format: `<fileId>.<exp>.<hmac>`.
 */
export function createShareSession(fileId: string): string {
  const exp = Date.now() + SHARE_SESSION_TTL_MS;
  const payload = `${fileId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** Validate a signed session cookie for `fileId`. Returns true only if the
 * signature matches and it has not expired. */
export function verifyShareSession(
  value: string | undefined,
  fileId: string
): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [sessFileId, expStr, mac] = parts;
  if (sessFileId !== fileId) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  return safeEqual(mac, sign(`${sessFileId}.${expStr}`));
}
