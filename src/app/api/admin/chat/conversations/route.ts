import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";

/** List conversations for the admin inbox, newest activity first within each status group. */
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const conversations = await prisma.conversation.findMany({
    where: { status: { not: "closed" } },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      status: c.status,
      name: c.name,
      email: c.email,
      customerName: c.customer?.name ?? null,
      locale: c.locale,
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: c.messages[0] ? { sender: c.messages[0].sender, content: c.messages[0].content } : null,
    })),
  });
}
