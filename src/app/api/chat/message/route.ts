import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateVisitorId } from "@/lib/chat/visitor-session";
import { getCustomerIdFromSession } from "@/lib/customer-auth";
import { getOrCreateConversation, escalateConversation, serializeMessage } from "@/lib/chat/conversation";
import { runBotTurn } from "@/lib/chat/bot";
import { publishMessage } from "@/lib/chat/pusher";

/** Visitor sends a chat message. Runs the bot (and escalates when needed) while the conversation is bot-handled; once a human owns it, just stores/broadcasts. */
export async function POST(req: Request) {
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  let body: { message?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const text = body.message?.trim();
  if (!text) return NextResponse.json({ error: "Message required." }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "Message too long." }, { status: 400 });
  const locale = body.locale === "fr" ? "fr" : "en";

  const visitorId = await getOrCreateVisitorId();
  const customerId = await getCustomerIdFromSession();
  const conversation = await getOrCreateConversation(visitorId, locale, customerId);
  if (!conversation) return NextResponse.json({ error: "Could not start conversation." }, { status: 500 });

  const visitorMessage = await prisma.chatMessage.create({
    data: { conversationId: conversation.id, sender: "visitor", content: text },
  });
  await publishMessage(conversation.id, serializeMessage(visitorMessage));
  const created = [visitorMessage];

  if (conversation.status === "bot") {
    const history = await prisma.chatMessage.findMany({
      where: { conversationId: conversation.id, sender: { in: ["visitor", "bot"] } },
      orderBy: { createdAt: "asc" },
      select: { sender: true, content: true },
    });
    const result = await runBotTurn(locale, history as { sender: "visitor" | "bot"; content: string }[], conversation.name ?? undefined);

    const botMessage = await prisma.chatMessage.create({
      data: { conversationId: conversation.id, sender: "bot", content: result.reply },
    });
    await publishMessage(conversation.id, serializeMessage(botMessage));
    created.push(botMessage);

    if (result.escalate) {
      await escalateConversation(conversation.id, result.escalateReason);
    }
  }

  return NextResponse.json({ messages: created.map(serializeMessage) });
}
