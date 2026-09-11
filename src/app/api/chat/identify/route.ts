import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateVisitorId } from "@/lib/chat/visitor-session";
import { identifyVisitor } from "@/lib/chat/identify";
import { serializeMessage } from "@/lib/chat/conversation";

/** Visitor submits their name + email before chatting — links or silently creates their Customer record. */
export async function POST(req: Request) {
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  let body: { name?: string; email?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const locale = body.locale === "fr" ? "fr" : "en";
  if (!name) return NextResponse.json({ error: "Name required." }, { status: 400 });
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Valid email required." }, { status: 400 });

  const visitorId = await getOrCreateVisitorId();
  const conversation = await identifyVisitor(visitorId, locale, name, email);
  if (!conversation) return NextResponse.json({ error: "Could not start conversation." }, { status: 500 });

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    conversation: { id: conversation.id, status: conversation.status, name: conversation.name, email: conversation.email },
    messages: messages.map(serializeMessage),
  });
}
