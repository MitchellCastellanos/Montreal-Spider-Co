"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import { renderAdminComposedEmail } from "@/lib/email-templates";
import { buildEmailChatGptPrompt } from "@/lib/email-chatgpt-prompt";
import { replyToContactMessageAction, sendComposedEmailAction } from "@/app/[locale]/admin/messages-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";

type ContactStatus = "new" | "replied";
type ContactReplyView = { id: string; subject: string; body: string; createdAt: string };
type ContactMessageView = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  locale: string;
  status: ContactStatus;
  createdAt: string;
  replies: ContactReplyView[];
};

const STATUS_STYLE: Record<ContactStatus, string> = {
  new: "bg-gold/15 text-gold-bright ring-1 ring-gold/40",
  replied: "bg-ink text-muted",
};

function defaultReplyDraft(name: string): string {
  return `Hi ${name || "there"},\n\nThank you for reaching out —\n\n\n\nIf you have any other questions, we're here to help.\n\nThe Montreal Spider Co. team.`;
}

function EmailPreview({ subject, body, locale }: { subject: string; body: string; locale: "en" | "fr" }) {
  const html = useMemo(() => renderAdminComposedEmail(locale, subject || "(no subject)", body).html, [subject, body, locale]);
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <iframe title="Email preview" srcDoc={html} className="h-[520px] w-full bg-white" />
    </div>
  );
}

function ReplyPanel({ message }: { message: ContactMessageView }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(replyToContactMessageAction, {});
  const [subject, setSubject] = useState(`Re: ${message.subject || "your message"}`);
  const [body, setBody] = useState(defaultReplyDraft(message.name));
  const [emailLocale, setEmailLocale] = useState<"en" | "fr">(message.locale === "fr" ? "fr" : "en");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <p className="font-medium text-cream">{message.name}</p>
          <p className="text-xs text-muted">
            {message.email}
            {message.phone && ` · ${message.phone}`} · {message.subject || "General"} · {formatDate(message.createdAt, "en")}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[message.status]}`}>
          {message.status}
        </span>
      </div>

      <p className="mb-4 whitespace-pre-wrap rounded-xl border border-line bg-ink p-3 text-sm text-bone">{message.message}</p>

      {message.replies.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Sent replies</p>
          {message.replies.map((r) => (
            <div key={r.id} className="rounded-xl border border-line bg-ink-soft/40 p-3 text-sm">
              <p className="mb-1 text-xs text-muted">
                {formatDate(r.createdAt, "en")} · <span className="text-bone">{r.subject}</span>
              </p>
              <p className="whitespace-pre-wrap text-bone">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="id" value={message.id} />
        <input type="hidden" name="to" value={message.email} />
        <input type="hidden" name="emailLocale" value={emailLocale} />

        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <label className="field">
            <span>Subject</span>
            <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="input" required />
          </label>
          <label className="field">
            <span>Language</span>
            <select value={emailLocale} onChange={(e) => setEmailLocale(e.target.value === "fr" ? "fr" : "en")} className="input">
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>Reply</span>
          <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} className="input min-h-48 resize-y" required />
        </label>

        {preview && <EmailPreview subject={subject} body={body} locale={emailLocale} />}

        {state.error && <p className="text-sm text-danger">Could not send: {state.error}</p>}
        {state.ok && <p className="text-sm text-ok">✓ Reply sent.</p>}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost text-sm" onClick={() => setPreview((v) => !v)}>
            {preview ? "Hide preview" : "Preview full email"}
          </button>
          <button className="btn btn-gold text-sm" disabled={pending}>
            {pending ? "Sending…" : "Send reply"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ComposePanel({ fromOptions }: { fromOptions: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendComposedEmailAction, {});
  const [topic, setTopic] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [emailLocale, setEmailLocale] = useState<"en" | "fr">("en");
  const [fromId, setFromId] = useState(fromOptions[0]?.id ?? "");
  const [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => buildEmailChatGptPrompt(topic, recipientName), [topic, recipientName]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gold/25 bg-gold/5 p-4">
        <h3 className="font-display text-sm font-semibold text-cream">Email generator</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-bone">
          <li>Say what the email is about below — the prompt updates automatically.</li>
          <li>Copy the prompt, paste it into ChatGPT, and send it.</li>
          <li>Paste ChatGPT&apos;s reply straight into the Message field.</li>
          <li>Preview, enter the destination email, and send.</li>
        </ol>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          <span>What&apos;s this email about?</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. following up on their wholesale inquiry"
            className="input"
          />
        </label>
        <label className="field">
          <span>Customer name (optional)</span>
          <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Alex" className="input" />
        </label>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-cream">Prompt — copy &amp; paste into ChatGPT</span>
          <button type="button" className="btn btn-gold text-xs" onClick={copyPrompt}>
            {copied ? "Copied!" : "Copy prompt"}
          </button>
        </div>
        <textarea
          readOnly
          value={prompt}
          className="input min-h-40 font-mono text-xs leading-relaxed text-bone"
          onFocus={(e) => e.target.select()}
        />
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="emailLocale" value={emailLocale} />
        <input type="hidden" name="from" value={fromId} />

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px]">
          <label className="field">
            <span>Destination email</span>
            <input name="to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com" className="input" required />
          </label>
          <label className="field">
            <span>Subject</span>
            <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="input" required />
          </label>
          <label className="field">
            <span>Language</span>
            <select value={emailLocale} onChange={(e) => setEmailLocale(e.target.value === "fr" ? "fr" : "en")} className="input">
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>Send from</span>
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="input">
            {fromOptions.length === 0 && <option value="">No sender addresses configured</option>}
            {fromOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Message (paste ChatGPT&apos;s reply here, or write your own)</span>
          <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} className="input min-h-48 resize-y" required />
        </label>

        {preview && <EmailPreview subject={subject} body={body} locale={emailLocale} />}

        {state.error && <p className="text-sm text-danger">Could not send: {state.error}</p>}
        {state.ok && <p className="text-sm text-ok">✓ Email sent.</p>}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost text-sm" onClick={() => setPreview((v) => !v)}>
            {preview ? "Hide preview" : "Preview full email"}
          </button>
          <button className="btn btn-gold text-sm" disabled={pending}>
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ContactInbox({
  messages,
  configured,
  fromOptions,
}: {
  messages: ContactMessageView[];
  configured: boolean;
  fromOptions: { id: string; label: string }[];
}) {
  const [tab, setTab] = useState<"inbox" | "compose">("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(messages[0]?.id ?? null);
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cream">Messages</h1>
        <div className="flex gap-1 rounded-full border border-line bg-ink-soft/40 p-1 text-sm">
          <button
            onClick={() => setTab("inbox")}
            className={`rounded-full px-3 py-1 transition ${tab === "inbox" ? "bg-gold/15 text-gold-bright" : "text-muted hover:text-bone"}`}
          >
            Inbox
          </button>
          <button
            onClick={() => setTab("compose")}
            className={`rounded-full px-3 py-1 transition ${tab === "compose" ? "bg-gold/15 text-gold-bright" : "text-muted hover:text-bone"}`}
          >
            Compose new email
          </button>
        </div>
      </div>

      {!configured && (
        <p className="mb-4 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm text-bone">
          ⚠️ Email delivery is not configured — set <code className="text-cream">RESEND_API_KEY</code> to send replies and emails.
        </p>
      )}

      {tab === "inbox" ? (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-line bg-ink-soft/40 p-3">
            <p className="mb-2 px-1 font-display text-sm font-bold text-cream">Contact form messages</p>
            {messages.length === 0 && <p className="px-1 text-sm text-muted">No messages yet.</p>}
            <ul className="space-y-1.5">
              {messages.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      selectedId === m.id ? "border-gold/50 bg-gold/10" : "border-line bg-ink hover:border-gold/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-cream">{m.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[m.status]}`}>
                        {m.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">{m.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{formatDate(m.createdAt, "en")}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 rounded-2xl border border-line bg-ink-soft/40 p-4">
            {!selected && <p className="text-sm text-muted">Select a message to view and reply.</p>}
            {selected && <ReplyPanel key={selected.id} message={selected} />}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-ink-soft/40 p-4">
          <ComposePanel fromOptions={fromOptions} />
        </div>
      )}
    </div>
  );
}
