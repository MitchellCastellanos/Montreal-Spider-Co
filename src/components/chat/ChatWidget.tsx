"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type PusherClient from "pusher-js";
import { useI18n } from "@/i18n/I18nProvider";

type Sender = "visitor" | "bot" | "staff" | "system";
type Status = "bot" | "waiting_human" | "live" | "closed";
type Msg = { id: string; sender: Sender; content: string; createdAt: string };

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

const TEASER_DISMISSED_KEY = "msc_chat_teaser_dismissed";

function stripChatParam(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("chat")) return;
  params.delete("chat");
  const qs = params.toString();
  window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
}

export default function ChatWidget() {
  const { dict, locale } = useI18n();
  const c = dict.chat;
  const pathname = usePathname();
  const isAdmin = /^\/(en|fr)\/admin(\/|$)/.test(pathname || "");

  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("bot");
  const [email, setEmail] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailPromptDismissed, setEmailPromptDismissed] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);

  const [showResume, setShowResume] = useState(false);
  const [resumeEmail, setResumeEmail] = useState("");
  const [resumeSent, setResumeSent] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<PusherClient | null>(null);

  const mergeMessages = useCallback((incoming: Msg[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const byId = new Map(prev.filter((m) => !m.id.startsWith("tmp-")).map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  // Restore an existing conversation on load; auto-open after a resume-email link.
  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat/conversation");
        const data = await res.json();
        if (cancelled) return;
        if (data.conversation) {
          setConversationId(data.conversation.id);
          setStatus(data.conversation.status);
          setEmail(data.conversation.email);
          mergeMessages(data.messages ?? []);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("chat") === "open" || params.get("chat") === "expired") {
        setOpen(true);
        stripChatParam();
      }
    }
    return () => {
      cancelled = true;
    };
  }, [mergeMessages, isAdmin]);

  // Realtime updates: Pusher when configured, otherwise poll while the panel is open.
  useEffect(() => {
    if (isAdmin || !conversationId) return;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    const channelName = `chat-${conversationId}`;

    if (key && cluster) {
      let mounted = true;
      import("pusher-js").then(({ default: Pusher }) => {
        if (!mounted) return;
        const pusher = new Pusher(key, { cluster });
        const channel = pusher.subscribe(channelName);
        channel.bind("message", (msg: Msg) => mergeMessages([msg]));
        pusherRef.current = pusher;
      });
      return () => {
        mounted = false;
        pusherRef.current?.unsubscribe(channelName);
        pusherRef.current?.disconnect();
        pusherRef.current = null;
      };
    }

    if (!open) return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/chat/conversation");
      const data = await res.json();
      if (data.conversation) {
        setStatus(data.conversation.status);
        mergeMessages(data.messages ?? []);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [conversationId, open, mergeMessages, isAdmin]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (emailPromptDismissed || email) return;
    const hasVisitor = messages.some((m) => m.sender === "visitor");
    const hasReply = messages.some((m) => m.sender === "bot" || m.sender === "staff");
    if (hasVisitor && hasReply) setShowEmailPrompt(true);
  }, [messages, email, emailPromptDismissed]);

  // Draw the eye with a proactive greeting bubble a couple of seconds after load —
  // but never for a returning visitor who's already mid-conversation, and only once per tab.
  useEffect(() => {
    if (isAdmin || !loaded || open || conversationId || messages.length > 0) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(TEASER_DISMISSED_KEY) === "1";
    } catch {
      // sessionStorage unavailable (private mode) — just show it.
    }
    if (dismissed) return;
    const timer = setTimeout(() => setShowTeaser(true), 2200);
    return () => clearTimeout(timer);
  }, [isAdmin, loaded, open, conversationId, messages.length]);

  const dismissTeaser = () => {
    setShowTeaser(false);
    try {
      sessionStorage.setItem(TEASER_DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const optimistic: Msg = { id: `tmp-${Date.now()}`, sender: "visitor", content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale }),
      });
      const data = await res.json();
      if (res.ok) {
        mergeMessages(data.messages ?? []);
        if (!conversationId) {
          const conv = await fetch("/api/chat/conversation").then((r) => r.json());
          if (conv.conversation) {
            setConversationId(conv.conversation.id);
            setStatus(conv.conversation.status);
          }
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const escalate = async () => {
    setStatus("waiting_human");
    await fetch("/api/chat/escalate", { method: "POST" });
  };

  const saveEmail = async () => {
    const value = emailInput.trim();
    if (!value) return;
    const res = await fetch("/api/chat/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value }),
    });
    if (res.ok) {
      setEmail(value);
      setEmailSaved(true);
      setShowEmailPrompt(false);
    }
  };

  const requestResume = async () => {
    const value = resumeEmail.trim();
    if (!value) return;
    setResumeSent(true);
    await fetch("/api/chat/resume/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value, locale }),
    });
  };

  const startNewChat = async () => {
    await fetch("/api/chat/new", { method: "POST" });
    setConversationId(null);
    setStatus("bot");
    setEmail(null);
    setMessages([]);
    setEmailPromptDismissed(false);
    setShowEmailPrompt(false);
    setEmailSaved(false);
    setShowResume(false);
    setResumeSent(false);
  };

  if (isAdmin || !loaded) return null;

  const statusLabel =
    status === "waiting_human" ? c.statusWaiting : status === "live" ? c.statusLive : status === "closed" ? c.statusClosed : c.subtitle;

  return (
    <>
      <AnimatePresence>
        {showTeaser && !open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-[68] w-72 max-w-[85vw] rounded-2xl border border-line bg-cream p-4 pr-8 text-ink shadow-2xl"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissTeaser();
              }}
              aria-label={dict.nav.close}
              className="absolute right-2.5 top-2.5 text-lg leading-none text-ink/40 hover:text-ink"
            >
              ×
            </button>
            <button
              onClick={() => {
                setOpen(true);
                dismissTeaser();
              }}
              className="flex items-start gap-3 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-base">🕷️</span>
              <span>
                <span className="block text-sm font-semibold">{c.teaserTitle}</span>
                <span className="mt-0.5 block text-sm text-ink/70">{c.teaserBody}</span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          setOpen((v) => !v);
          dismissTeaser();
        }}
        aria-label={c.bubbleLabel}
        className="fixed bottom-5 right-5 z-[69] flex h-16 w-16 items-center justify-center rounded-full bg-gold text-ink shadow-2xl transition hover:scale-105 hover:bg-gold-bright"
      >
        {open ? (
          <span className="text-3xl leading-none">×</span>
        ) : (
          <>
            <ChatIcon className="h-7 w-7" />
            <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink bg-ok" />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-24 right-5 z-[70] flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-ink-soft shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label={c.title}
          >
            <header className="flex items-center justify-between border-b border-line bg-ink px-4 py-3">
              <div>
                <p className="font-display text-sm font-bold text-cream">{c.title}</p>
                <p className="text-xs text-muted">{statusLabel}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label={dict.nav.close} className="text-xl leading-none text-bone hover:text-gold-bright">
                ×
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.length === 0 && <div className="rounded-xl bg-ink px-3 py-2 text-sm text-bone">{c.greeting}</div>}

              {messages.map((m) =>
                m.sender === "system" ? (
                  <p key={m.id} className="text-center text-xs text-muted">
                    {c.staffJoined.replace("{name}", m.content)}
                  </p>
                ) : (
                  <div key={m.id} className={`flex ${m.sender === "visitor" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.sender === "visitor" ? "bg-gold/15 text-cream" : "bg-ink text-bone"}`}>
                      {m.content}
                    </div>
                  </div>
                ),
              )}

              {showEmailPrompt && (
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm">
                  <p className="font-medium text-cream">{c.emailPromptTitle}</p>
                  <p className="mt-1 text-xs text-bone">{c.emailPromptBody}</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder={c.emailPlaceholder}
                    />
                    <button onClick={() => void saveEmail()} className="btn btn-gold text-sm">
                      {c.emailSubmit}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowEmailPrompt(false);
                      setEmailPromptDismissed(true);
                    }}
                    className="mt-2 text-xs text-muted hover:text-bone"
                  >
                    {dict.nav.close}
                  </button>
                </div>
              )}
              {emailSaved && <p className="text-center text-xs text-ok">{c.emailSaved}</p>}
            </div>

            {status === "closed" ? (
              <footer className="border-t border-line p-3">
                <button onClick={() => void startNewChat()} className="btn btn-gold w-full text-sm">
                  {c.newChat}
                </button>
              </footer>
            ) : (
              <footer className="border-t border-line p-3">
                {messages.length === 0 && !showResume && (
                  <button onClick={() => setShowResume(true)} className="mb-2 text-xs text-muted hover:text-gold-bright">
                    {c.resumeLink}
                  </button>
                )}
                {showResume && !resumeSent && (
                  <div className="mb-2 rounded-lg bg-ink p-2 text-xs">
                    <p className="text-bone">{c.resumeBody}</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <input
                        className="input flex-1 text-xs"
                        type="email"
                        value={resumeEmail}
                        onChange={(e) => setResumeEmail(e.target.value)}
                        placeholder={c.emailPlaceholder}
                      />
                      <button onClick={() => void requestResume()} className="btn btn-ghost text-xs">
                        {c.resumeSubmit}
                      </button>
                    </div>
                  </div>
                )}
                {resumeSent && <p className="mb-2 text-xs text-ok">{c.resumeSent}</p>}

                <div className="flex items-end gap-2">
                  <textarea
                    className="input flex-1 resize-none text-sm"
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={c.placeholder}
                  />
                  <button onClick={() => void send()} disabled={sending || !input.trim()} className="btn btn-gold text-sm">
                    {c.send}
                  </button>
                </div>
                {status === "bot" && (
                  <button onClick={() => void escalate()} className="mt-2 text-xs text-muted hover:text-gold-bright">
                    {c.talkToHuman}
                  </button>
                )}
              </footer>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
