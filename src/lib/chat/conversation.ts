import "server-only";
import type { ChatMessage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publishConversationUpdate } from "@/lib/chat/pusher";
import { sendTelegramAlert } from "@/lib/chat/telegram";
import { notifyStaff } from "@/lib/notifications/service";
import { SITE } from "@/lib/site";
import type { ChatMessagePayload, ProductCard } from "@/lib/chat/types";

export function serializeMessage(m: ChatMessage): ChatMessagePayload {
  const meta = (m.meta as { products?: ProductCard[] } | null) ?? {};
  return {
    id: m.id,
    sender: m.sender,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    products: meta.products?.length ? meta.products : undefined,
  };
}

/** Finds (or lazily creates) the Conversation owned by this visitor cookie. */
export async function getOrCreateConversation(visitorId: string, locale: string, customerId?: string | null) {
  if (!prisma) return null;
  const existing = await prisma.conversation.findUnique({ where: { visitorId } });
  if (existing) {
    if (customerId && !existing.customerId) {
      return prisma.conversation.update({ where: { id: existing.id }, data: { customerId } });
    }
    return existing;
  }
  return prisma.conversation.create({
    data: { visitorId, locale, customerId: customerId ?? undefined },
  });
}

/**
 * Marks a conversation as needing a human and alerts staff (Telegram + email) —
 * but only once per wait, so a chatty visitor doesn't spam the operator.
 */
export async function escalateConversation(conversationId: string, reason?: string): Promise<void> {
  if (!prisma) return;
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv || conv.status === "live" || conv.status === "closed") return;

  const alreadyAlerted = conv.staffAlerted;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: "waiting_human", staffAlerted: true },
  });
  await publishConversationUpdate(conversationId);

  if (alreadyAlerted) return;

  const adminUrl = `${SITE.url}/en/admin/chat/${conversationId}`;
  const visitorLabel = conv.name && conv.email ? `${conv.name} (${conv.email})` : conv.email || "an anonymous visitor";
  const reasonText = reason || "The visitor asked to speak with a person.";

  await sendTelegramAlert(`💬 <b>Chat needs you</b>\n${visitorLabel}\n"${reasonText}"\n${adminUrl}`);
  await notifyStaff({
    templateId: "internal-chat-escalation",
    event: "chat.escalated",
    data: { visitor: visitorLabel, reason: reasonText, adminUrl },
    context: { conversationId },
  });
}
