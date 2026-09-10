import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/** Drops the visitor's session cookie so their next message starts a fresh conversation (used after a chat is closed). */
export async function POST() {
  const store = await cookies();
  store.delete("msc_chat_visitor");
  return NextResponse.json({ ok: true });
}
