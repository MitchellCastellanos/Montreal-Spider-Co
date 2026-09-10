import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthed } from "@/lib/auth";
import { publishConversationUpdate } from "@/lib/chat/pusher";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.conversation.update({ where: { id }, data: { status: "closed" } });
  await publishConversationUpdate(id);

  return NextResponse.json({ ok: true });
}
