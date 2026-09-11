import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVisitorId } from "@/lib/chat/visitor-session";
import { serializeMessage } from "@/lib/chat/conversation";

/** Loads the current visitor's conversation (if any) — used to restore the widget on page load/reload. */
export async function GET() {
  if (!prisma) return NextResponse.json({ conversation: null, messages: [] });

  const visitorId = await getVisitorId();
  if (!visitorId) return NextResponse.json({ conversation: null, messages: [] });

  const conversation = await prisma.conversation.findUnique({
    where: { visitorId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ conversation: null, messages: [] });

  return NextResponse.json({
    conversation: { id: conversation.id, status: conversation.status, name: conversation.name, email: conversation.email },
    messages: conversation.messages.map(serializeMessage),
  });
}
