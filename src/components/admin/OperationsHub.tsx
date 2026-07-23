"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  fulfillmentTransitionAction,
  resolveTaskAction,
} from "@/app/[locale]/admin/ops-actions";
import type { ActionState } from "@/app/[locale]/admin/actions";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/lib/href";

export interface FulfillmentRow {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  method: string;
  locationName: string | null;
  items: string;
  total: number;
  readyAt: string | null;
  collectBy: string | null;
  remindersSent: number;
  pickupToken: string;
  createdAt: string;
}

export interface TaskRow {
  id: string;
  type: string;
  status: string;
  title: string;
  details: string;
  specimenId: string | null;
  locationName: string | null;
  orderNumber: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-gold/15 text-gold-bright",
  preparing: "bg-sky-500/15 text-sky-300",
  ready: "bg-emerald-500/15 text-emerald-300",
  completed: "bg-emerald-500/10 text-emerald-400",
  no_show: "bg-red-500/15 text-red-300",
  cancelled: "bg-red-500/10 text-red-400",
};

const TASK_TYPE_LABELS: Record<string, string> = {
  no_show_disposition: "Disposition",
  audit_investigation: "Investigation",
  inventory_correction: "Correction",
  restock_approval: "Restock",
  general: "General",
};

function TransitionButton({
  fulfillmentId,
  transition,
  label,
  danger,
  confirmText,
}: {
  fulfillmentId: string;
  transition: string;
  label: string;
  danger?: boolean;
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    fulfillmentTransitionAction,
    {},
  );
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className="inline"
    >
      <input type="hidden" name="fulfillmentId" value={fulfillmentId} />
      <input type="hidden" name="transition" value={transition} />
      <button
        disabled={pending}
        className={`rounded-lg px-3 py-1.5 text-xs transition disabled:opacity-50 ${
          danger
            ? "border border-line text-bone hover:text-danger"
            : "bg-gold/15 text-gold-bright ring-1 ring-gold/40 hover:bg-gold/25"
        }`}
      >
        {pending ? "…" : label}
      </button>
      {state.error && <span className="ml-2 text-xs text-danger">{state.error}</span>}
    </form>
  );
}

function FulfillmentCard({ f }: { f: FulfillmentRow }) {
  return (
    <div className="rounded-xl border border-line bg-ink-soft/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-cream">{f.orderNumber}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[f.status] ?? "text-muted"}`}>
          {f.status.replace("_", " ")}
        </span>
        <span className="text-xs text-muted">{f.createdAt}</span>
        <span className="ml-auto text-sm text-gold-bright">${f.total.toFixed(2)}</span>
      </div>
      <p className="mt-2 text-sm text-bone">
        {f.customerName}
        {f.customerPhone && <span className="text-muted"> · {f.customerPhone}</span>}
        <span className="text-muted"> · {f.customerEmail}</span>
      </p>
      <p className="mt-1 text-sm text-muted">{f.method}{f.locationName ? ` — ${f.locationName}` : ""}</p>
      <p className="mt-1 text-sm text-cream">{f.items}</p>
      {f.collectBy && (
        <p className="mt-1 text-xs text-muted">
          Ready {f.readyAt} · collect by <span className="text-gold-bright">{f.collectBy}</span>
          {f.remindersSent > 0 && ` · ${f.remindersSent} reminder(s) sent`}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {f.status === "pending" && (
          <TransitionButton fulfillmentId={f.id} transition="preparing" label="Start preparing" />
        )}
        {(f.status === "pending" || f.status === "preparing") && (
          <TransitionButton fulfillmentId={f.id} transition="ready" label="Mark ready (emails customer)" />
        )}
        {f.status === "ready" && (
          <>
            <TransitionButton fulfillmentId={f.id} transition="complete" label="Confirm handover → SOLD" />
            <TransitionButton fulfillmentId={f.id} transition="remind" label="Send reminder" />
            <TransitionButton
              fulfillmentId={f.id}
              transition="no-show"
              label="No-show (refund + release)"
              danger
              confirmText="Cancel this order as a no-show? This refunds the customer and releases the specimens."
            />
          </>
        )}
        {(f.status === "pending" || f.status === "preparing" || f.status === "ready") && (
          <TransitionButton
            fulfillmentId={f.id}
            transition="cancel"
            label="Cancel + refund"
            danger
            confirmText="Cancel this order and refund the customer?"
          />
        )}
      </div>
    </div>
  );
}

function TaskCard({ t, locale }: { t: TaskRow; locale: Locale }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(resolveTaskAction, {});
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-ink-soft/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold-bright">
          {TASK_TYPE_LABELS[t.type] ?? t.type}
        </span>
        <span className="font-medium text-cream">{t.title}</span>
        <span className="ml-auto text-xs text-muted">{t.createdAt}</span>
      </div>
      {t.details && <p className="mt-2 whitespace-pre-line text-sm text-bone">{t.details}</p>}
      <p className="mt-1 text-xs text-muted">
        {t.locationName && <>Location: {t.locationName} · </>}
        {t.orderNumber && <>Order: {t.orderNumber} · </>}
        {t.specimenId && (
          <Link
            href={localeHref(locale, `/admin/specimens/${t.specimenId}`)}
            className="text-gold-bright hover:underline"
          >
            View specimen →
          </Link>
        )}
      </p>
      {open ? (
        <form action={formAction} className="mt-3 space-y-2">
          <input type="hidden" name="taskId" value={t.id} />
          <input
            type="text"
            name="resolution"
            placeholder="Resolution notes (e.g. returned to warehouse)"
            className="w-full rounded-lg border border-line bg-ink p-2 text-sm text-cream"
          />
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
          <div className="flex gap-2">
            <button
              disabled={pending}
              className="rounded-lg bg-gold/15 px-3 py-1.5 text-xs text-gold-bright ring-1 ring-gold/40 disabled:opacity-50"
            >
              Mark done
            </button>
            <button
              name="dismiss"
              value="true"
              disabled={pending}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-bone disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 rounded-lg border border-line px-3 py-1.5 text-xs text-bone transition hover:text-gold-bright"
        >
          Resolve…
        </button>
      )}
    </div>
  );
}

export default function OperationsHub({
  active,
  recent,
  tasks,
  locale,
}: {
  active: FulfillmentRow[];
  recent: FulfillmentRow[];
  tasks: TaskRow[];
  locale: Locale;
}) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cream">Operations</h1>
      <p className="mt-1 text-sm text-muted">
        Fulfillment queue and internal tasks. Specimens stay ALLOCATED until handover is confirmed here (or via the partner link).
      </p>

      <h2 className="mt-8 font-display text-lg font-bold text-cream">
        Fulfillment queue <span className="text-sm font-normal text-muted">({active.length})</span>
      </h2>
      <div className="mt-3 space-y-3">
        {active.length === 0 && <p className="text-sm text-muted">Nothing in flight — all orders are settled.</p>}
        {active.map((f) => (
          <FulfillmentCard key={f.id} f={f} />
        ))}
      </div>

      <h2 className="mt-10 font-display text-lg font-bold text-cream">
        Open tasks <span className="text-sm font-normal text-muted">({tasks.length})</span>
      </h2>
      <div className="mt-3 space-y-3">
        {tasks.length === 0 && <p className="text-sm text-muted">No open tasks.</p>}
        {tasks.map((t) => (
          <TaskCard key={t.id} t={t} locale={locale} />
        ))}
      </div>

      {recent.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg font-bold text-cream">Recently closed</h2>
          <div className="mt-3 space-y-3">
            {recent.map((f) => (
              <FulfillmentCard key={f.id} f={f} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
