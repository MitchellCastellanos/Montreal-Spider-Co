import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { serializeMessage } from "@/lib/chat/conversation";
import { publishMessage, publishConversationUpdate } from "@/lib/chat/pusher";

type Params = { params: Promise<{ id: string }> };

/** Staff sends a reply. The first reply on a conversation announces "<name> joined the chat" and takes it live. */
export async function POST(req: Request, { params }: Params) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const text = body.message?.trim();
  if (!text) return NextResponse.json({ error: "Message required." }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const created = [];

  if (conversation.status !== "live") {
    const staffName = process.env.STAFF_DISPLAY_NAME || "Our team";
    const joinMessage = await prisma.chatMessage.create({
      data: { conversationId: id, sender: "system", content: staffName },
    });
    await publishMessage(id, serializeMessage(joinMessage));
    created.push(joinMessage);
    await prisma.conversation.update({ where: { id }, data: { status: "live" } });
  }

  const staffMessage = await prisma.chatMessage.create({
    data: { conversationId: id, sender: "staff", content: text },
  });
  await publishMessage(id, serializeMessage(staffMessage));
  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
  await publishConversationUpdate(id);
  created.push(staffMessage);

  return NextResponse.json({ messages: created.map(serializeMessage) });
}
