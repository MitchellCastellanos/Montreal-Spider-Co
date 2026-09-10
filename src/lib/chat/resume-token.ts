import "server-only";
import crypto from "node:crypto";

/**
 * Signed, expiring token that lets a visitor resume their chat conversation
 * from a different browser after clicking the link emailed to them —
 * same HMAC-cookie pattern as customer/admin auth (see `@/lib/auth`).
 */

const TTL_MS = 30 * 60 * 1000; // 30 minutes

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

/** conversationId + visitorId to embed in the link, signed with an expiry. */
export function createResumeToken(conversationId: string, visitorId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${conversationId}.${visitorId}.${expires}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyResumeToken(token: string): { conversationId: string; visitorId: string } | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const parts = decoded.split(".");
  if (parts.length !== 4) return null;
  const [conversationId, visitorId, expiresStr, sig] = parts;
  const expires = Number(expiresStr);
  if (!conversationId || !visitorId || !Number.isFinite(expires)) return null;
  if (Date.now() > expires) return null;

  const expected = sign(`${conversationId}.${visitorId}.${expiresStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  return { conversationId, visitorId };
}
