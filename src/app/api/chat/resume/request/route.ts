import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createResumeToken } from "@/lib/chat/resume-token";
import { sendNotification } from "@/lib/notifications/service";
import { SITE } from "@/lib/site";

/**
 * Visitor asks to continue a past conversation from this browser. Always
 * responds ok — never reveals whether that email has a conversation on file.
 */
export async function POST(req: Request) {
  if (!prisma) return NextResponse.json({ ok: true });

  let body: { email?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const locale = body.locale === "fr" ? "fr" : "en";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { email, status: { not: "closed" } },
    orderBy: { updatedAt: "desc" },
  });
  if (!conversation) return NextResponse.json({ ok: true });

  const token = createResumeToken(conversation.id, conversation.visitorId);
  const resumeUrl = `${SITE.url}/api/chat/resume?token=${token}`;
  await sendNotification({
    templateId: "chat-resume",
    event: "chat.resume_requested",
    to: email,
    locale,
    data: { resumeUrl },
    context: { conversationId: conversation.id },
  });

  return NextResponse.json({ ok: true });
}
