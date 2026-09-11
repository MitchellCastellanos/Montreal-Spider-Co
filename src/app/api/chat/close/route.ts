import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId } from "@/lib/chat/visitor-session";
import { publishConversationUpdate } from "@/lib/chat/pusher";

/** Visitor ends their own conversation (e.g. after finishing with a staff member) so they can start fresh with the bot. */
export async function POST() {
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const visitorId = await getVisitorId();
  if (!visitorId) return NextResponse.json({ error: "No conversation yet." }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { visitorId } });
  if (!conversation) return NextResponse.json({ error: "No conversation yet." }, { status: 400 });
  if (conversation.status === "closed") return NextResponse.json({ ok: true });

  await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "closed" } });
  await publishConversationUpdate(conversation.id);

  return NextResponse.json({ ok: true });
}
