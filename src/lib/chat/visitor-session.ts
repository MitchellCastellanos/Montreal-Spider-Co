import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

const COOKIE = "msc_chat_visitor";

/** Returns the visitor id from the cookie, or null if this browser hasn't chatted yet. */
export async function getVisitorId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/** Returns the existing visitor id, or mints and stores a new unguessable one. */
export async function getOrCreateVisitorId(): Promise<string> {
  const existing = await getVisitorId();
  if (existing) return existing;
  const id = crypto.randomBytes(24).toString("hex");
  await setVisitorId(id);
  return id;
}

export async function setVisitorId(id: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
