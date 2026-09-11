"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type PusherClient from "pusher-js";
import { formatDate } from "@/lib/format";
import type { ProductCard } from "@/lib/chat/types";

type Status = "bot" | "waiting_human" | "live" | "closed";
type Sender = "visitor" | "bot" | "staff" | "system";
type Msg = { id: string; sender: Sender; content: string; createdAt: string; products?: ProductCard[] };

type ConversationSummary = {
  id: string;
  status: Status;
  name: string | null;
  email: string | null;
  customerName: string | null;
  locale: string;
  updatedAt: string;
  lastMessage: { sender: Sender; content: string } | null;
};

type ConversationDetail = {
  id: string;
  status: Status;
  name: string | null;
  email: string | null;
  locale: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
};

const STATUS_ORDER: Record<Status, number> = { waiting_human: 0, live: 1, bot: 2, closed: 3 };
const STATUS_LABEL: Record<Status, string> = { waiting_human: "Needs you", live: "Live", bot: "Bot", closed: "Closed" };
const STATUS_STYLE: Record<Status, string> = {
  waiting_human: "bg-danger/15 text-danger ring-1 ring-danger/40",
  live: "bg-ok/15 text-ok ring-1 ring-ok/40",
  bot: "bg-ink text-muted",
  closed: "bg-ink text-muted",
};

export default function AdminChatInbox({ initialSelectedId }: { initialSelectedId?: string } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.match(/^\/(en|fr)\//)?.[1] ?? "en";

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<PusherClient | null>(null);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/chat/conversations");
      const data = (await res.json()) as { conversations?: ConversationSummary[] };
      if (data.conversations) {
        setConversations([...data.conversations].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.updatedAt.localeCompare(a.updatedAt)));
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/chat/${id}`);
    const data = (await res.json()) as { conversation?: ConversationDetail; messages?: Msg[] };
    if (data.conversation) {
      setDetail(data.conversation);
      setMessages(data.messages ?? []);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else {
      setDetail(null);
      setMessages([]);
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Realtime: Pusher when configured, else poll.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (key && cluster) {
      let mounted = true;
      import("pusher-js").then(({ default: Pusher }) => {
        if (!mounted) return;
        const pusher = new Pusher(key, { cluster });
        pusher.subscribe("chat-admin").bind("conversation-updated", () => void loadList());
        pusherRef.current = pusher;
      });
      return () => {
        mounted = false;
        pusherRef.current?.unsubscribe("chat-admin");
        pusherRef.current?.disconnect();
        pusherRef.current = null;
      };
    }

    const interval = setInterval(() => void loadList(), 5000);
    return () => clearInterval(interval);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    const channelName = `chat-${selectedId}`;

    if (key && cluster) {
      let mounted = true;
      let localPusher: PusherClient | null = null;
      import("pusher-js").then(({ default: Pusher }) => {
        if (!mounted) return;
        localPusher = new Pusher(key, { cluster });
        localPusher.subscribe(channelName).bind("message", (msg: Msg) => {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        });
      });
      return () => {
        mounted = false;
        localPusher?.unsubscribe(channelName);
        localPusher?.disconnect();
      };
    }

    const interval = setInterval(() => void loadDetail(selectedId), 3000);
    return () => clearInterval(interval);
  }, [selectedId, loadDetail]);

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setReply("");
    try {
      const res = await fetch(`/api/admin/chat/${selectedId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { messages?: Msg[] };
      if (data.messages) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...data.messages!.filter((m) => !ids.has(m.id))];
        });
        setDetail((d) => (d ? { ...d, status: "live" } : d));
      }
      void loadList();
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (id: string) => {
    setSelectedId(id);
    router.replace(`/${locale}/admin/chat/${id}`, { scroll: false });
  };

  const closeConversation = async () => {
    if (!selectedId) return;
    await fetch(`/api/admin/chat/${selectedId}/close`, { method: "POST" });
    setDetail((d) => (d ? { ...d, status: "closed" } : d));
    void loadList();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="rounded-2xl border border-line bg-ink-soft/40 p-3">
        <p className="mb-2 px-1 font-display text-sm font-bold text-cream">Conversations</p>
        {loadingList && <p className="px-1 text-sm text-muted">Loading…</p>}
        {!loadingList && conversations.length === 0 && <p className="px-1 text-sm text-muted">No conversations yet.</p>}
        <ul className="space-y-1.5">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => selectConversation(c.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  selectedId === c.id ? "border-gold/50 bg-gold/10" : "border-line bg-ink hover:border-gold/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-cream">{c.customerName || c.name || c.email || "Anonymous visitor"}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                {c.lastMessage && (
                  <p className="mt-1 truncate text-xs text-muted">
                    {c.lastMessage.sender === "staff" ? "You: " : c.lastMessage.sender === "system" ? "" : ""}
                    {c.lastMessage.content}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-muted">{formatDate(c.updatedAt, "en")}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="min-w-0 rounded-2xl border border-line bg-ink-soft/40 p-4">
        {!selectedId && <p className="text-sm text-muted">Select a conversation to view it.</p>}
        {selectedId && detail && (
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <p className="font-medium text-cream">{detail.customerName || detail.name || detail.email || "Anonymous visitor"}</p>
                <p className="text-xs text-muted">
                  {detail.customerEmail || detail.email || "No email on file"}
                  {detail.customerPhone && ` · ${detail.customerPhone}`} · {detail.locale.toUpperCase()}
                </p>
              </div>
              {detail.status !== "closed" && (
                <button onClick={() => void closeConversation()} className="btn btn-ghost text-xs">
                  Close conversation
                </button>
              )}
            </div>

            <div ref={listRef} className="mb-3 max-h-[50vh] flex-1 space-y-2 overflow-y-auto">
              {messages.map((m) =>
                m.sender === "system" ? (
                  <p key={m.id} className="text-center text-xs text-muted">
                    {m.content} joined the chat
                  </p>
                ) : (
                  <div key={m.id} className={`flex ${m.sender === "staff" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[75%] space-y-1.5">
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          m.sender === "staff" ? "bg-gold/15 text-cream" : m.sender === "bot" ? "bg-ink text-bone" : "bg-ink-soft text-bone"
                        }`}
                      >
                        <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted">{m.sender}</span>
                        {m.content}
                      </div>
                      {m.products && m.products.length > 0 && (
                        <div className="space-y-1">
                          {m.products.map((p) => (
                            <a
                              key={p.slug}
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg border border-line bg-ink p-1.5 text-xs transition hover:border-gold/50"
                            >
                              {p.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.image} alt={p.name} className="h-8 w-8 shrink-0 rounded object-cover" />
                              ) : (
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-ink-soft">🕷️</span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-cream">{p.name}</span>
                                <span className="block text-gold-bright">${p.price.toFixed(2)} CAD</span>
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>

            {detail.status === "closed" ? (
              <p className="text-sm text-muted">This conversation is closed.</p>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void sendReply();
                  }}
                  placeholder="Type a reply…"
                />
                <button onClick={() => void sendReply()} disabled={sending || !reply.trim()} className="btn btn-gold text-sm">
                  Send
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
