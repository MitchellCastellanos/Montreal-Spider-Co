import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE = "msc_admin";
const SESSION_PAYLOAD = "msc-admin-session-v1";

/** Admin login is available only when ADMIN_PASSWORD is configured. */
export const adminConfigured = Boolean(process.env.ADMIN_PASSWORD);

function signingSecret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sessionToken(): string {
  return crypto.createHmac("sha256", signingSecret()).update(SESSION_PAYLOAD).digest("hex");
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function isAdminAuthed(): Promise<boolean> {
  if (!adminConfigured) return false;
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  if (!value) return false;
  const expected = sessionToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function setAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
