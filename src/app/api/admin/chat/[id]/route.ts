import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { serializeMessage } from "@/lib/chat/conversation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      status: conversation.status,
      name: conversation.name,
      email: conversation.email,
      locale: conversation.locale,
      customerName: conversation.customer?.name ?? null,
      customerEmail: conversation.customer?.email ?? null,
      customerPhone: conversation.customer?.phone ?? null,
    },
    messages: conversation.messages.map(serializeMessage),
  });
}
