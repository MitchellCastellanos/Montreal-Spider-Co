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

  // Other conversations from the same person — nothing a visitor "ended" is ever lost,
  // it's just a separate thread the admin can jump back into.
  const history = conversation.customerId
    ? await prisma.conversation.findMany({
        where: { customerId: conversation.customerId, id: { not: conversation.id } },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, status: true, updatedAt: true, _count: { select: { messages: true } } },
      })
    : conversation.email
      ? await prisma.conversation.findMany({
          where: { email: conversation.email, id: { not: conversation.id } },
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: { id: true, status: true, updatedAt: true, _count: { select: { messages: true } } },
        })
      : [];

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
    history: history.map((h) => ({
      id: h.id,
      status: h.status,
      updatedAt: h.updatedAt.toISOString(),
      messageCount: h._count.messages,
    })),
  });
}
