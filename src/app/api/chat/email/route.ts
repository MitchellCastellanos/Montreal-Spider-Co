import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId } from "@/lib/chat/visitor-session";

/** Captures the visitor's email on their conversation — enables cross-device resume and follow-up. */
export async function POST(req: Request) {
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const visitorId = await getVisitorId();
  if (!visitorId) return NextResponse.json({ error: "No conversation yet." }, { status: 400 });

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({ where: { visitorId } });
  if (!conversation) return NextResponse.json({ error: "No conversation yet." }, { status: 400 });

  await prisma.conversation.update({ where: { id: conversation.id }, data: { email } });
  return NextResponse.json({ ok: true });
}
