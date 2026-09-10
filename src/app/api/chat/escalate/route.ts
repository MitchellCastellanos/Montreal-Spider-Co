import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId } from "@/lib/chat/visitor-session";
import { escalateConversation } from "@/lib/chat/conversation";

/** Visitor taps "talk to a human" explicitly, without waiting on the bot to decide. */
export async function POST() {
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const visitorId = await getVisitorId();
  if (!visitorId) return NextResponse.json({ error: "No conversation yet." }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { visitorId } });
  if (!conversation) return NextResponse.json({ error: "No conversation yet." }, { status: 400 });

  await escalateConversation(conversation.id, 'Visitor tapped "talk to a human".');
  return NextResponse.json({ ok: true });
}
