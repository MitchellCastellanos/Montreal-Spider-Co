import "server-only";
import type { ChatMessage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publishConversationUpdate, publishMessage } from "@/lib/chat/pusher";
import { sendTelegramAlert } from "@/lib/chat/telegram";
import { notifyStaff, sendNotification } from "@/lib/notifications/service";
import { getChatSettings, isWithinChatHours } from "@/lib/chat/settings";
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

function offlineConfirmationText(locale: string): string {
  return locale === "fr"
    ? "Merci ! Nous sommes hors ligne en ce moment, mais notre équipe vous répondra dans un délai de 24 heures ouvrables."
    : "Thanks! We're offline right now, but our team will reply within 24 business hours.";
}

/**
 * Marks a conversation as needing a human and alerts staff — but only once per wait, so a
 * chatty visitor doesn't spam the operator. During business hours that's an urgent Telegram
 * ping + email, same as always. Outside business hours it's the same flow as the /contact
 * form instead (email only, no urgent ping) plus a 24-business-hour reply promise, both to
 * staff and back to the visitor, and a confirmation message right in the chat.
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

  const chatSettings = await getChatSettings();
  if (isWithinChatHours(chatSettings.hours)) {
    await sendTelegramAlert(`💬 <b>Chat needs you</b>\n${visitorLabel}\n"${reasonText}"\n${adminUrl}`);
    await notifyStaff({
      templateId: "internal-chat-escalation",
      event: "chat.escalated",
      data: { visitor: visitorLabel, reason: reasonText, adminUrl },
      context: { conversationId },
    });
    return;
  }

  await notifyStaff({
    templateId: "internal-contact-message",
    event: "chat.escalated_after_hours",
    data: {
      name: conv.name || "Anonymous visitor",
      email: conv.email || "—",
      phone: "—",
      subject: "Live chat (after hours)",
      message: reasonText,
    },
    context: { conversationId },
  });

  if (conv.email) {
    await sendNotification({
      templateId: "contact-received",
      event: "chat.escalated_after_hours",
      to: conv.email,
      locale: conv.locale === "fr" ? "fr" : "en",
      data: { name: conv.name || "" },
      context: { conversationId },
    });
  }

  const confirmMessage = await prisma.chatMessage.create({
    data: { conversationId, sender: "bot", content: offlineConfirmationText(conv.locale) },
  });
  await publishMessage(conversationId, serializeMessage(confirmMessage));
}
