import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId } from "@/lib/chat/visitor-session";
import { escalateConversation, serializeMessage } from "@/lib/chat/conversation";
import { publishMessage } from "@/lib/chat/pusher";

/**
 * Visitor taps "talk to a human", without waiting on the bot to decide. When they're leaving a
 * message via the offline form, `message` carries what they typed — saved to the transcript
 * first so staff sees it, then used as the escalation's context.
 */
export async function POST(req: Request) {
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const visitorId = await getVisitorId();
  if (!visitorId) return NextResponse.json({ error: "No conversation yet." }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { visitorId } });
  if (!conversation) return NextResponse.json({ error: "No conversation yet." }, { status: 400 });

  let body: { message?: string } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine — a plain "talk to a human" tap sends none
  }
  const text = body.message?.trim().slice(0, 4000);

  let saved;
  if (text) {
    saved = await prisma.chatMessage.create({
      data: { conversationId: conversation.id, sender: "visitor", content: text },
    });
    await publishMessage(conversation.id, serializeMessage(saved));
  }

  await escalateConversation(conversation.id, text || 'Visitor tapped "talk to a human".');
  return NextResponse.json({ ok: true, message: saved ? serializeMessage(saved) : undefined });
}
