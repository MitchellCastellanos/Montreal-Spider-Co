import "server-only";
import Pusher from "pusher";
import type { ChatMessagePayload } from "@/lib/chat/types";

export type { ChatMessagePayload };

export const realtimeConfigured = Boolean(
  process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER,
);

let client: Pusher | null = null;

function getClient(): Pusher | null {
  if (!realtimeConfigured) return null;
  if (!client) {
    client = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return client;
}

/** Per-conversation channel — the widget and the admin detail panel both subscribe here. */
export function conversationChannel(conversationId: string): string {
  return `chat-${conversationId}`;
}

/** Shared channel the admin inbox list subscribes to, for cross-conversation updates. */
export const ADMIN_CHANNEL = "chat-admin";

/** Publishes a new message to a conversation's channel. Never throws — realtime is best-effort, polling/refetch is the fallback. */
export async function publishMessage(conversationId: string, message: ChatMessagePayload): Promise<void> {
  const pusher = getClient();
  if (!pusher) return;
  try {
    await pusher.trigger(conversationChannel(conversationId), "message", message);
  } catch (e) {
    console.error("[chat/pusher] publishMessage failed:", e);
  }
}

/** Notifies the admin inbox that a conversation's status/summary changed (new chat, escalated, closed…). */
export async function publishConversationUpdate(conversationId: string): Promise<void> {
  const pusher = getClient();
  if (!pusher) return;
  try {
    await pusher.trigger(ADMIN_CHANNEL, "conversation-updated", { conversationId });
  } catch (e) {
    console.error("[chat/pusher] publishConversationUpdate failed:", e);
  }
}
