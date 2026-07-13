"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatPrice } from "@/lib/format";

type OrderStatus = "paid" | "processing" | "ready" | "delivered" | "cancelled";

interface OrderDetail {
  orderNumber: string;
  status: OrderStatus;
  statusDetail: string;
  total: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  lines: { name: string; size: string; qty: number; price: number }[];
  messages: { id: string; author: string; body: string; date: string }[];
}

export default function AdminOrderPanel({ orderNumber, open }: { orderNumber: string; open: boolean }) {
  const { dict, locale } = useI18n();
  const ad = dict.admin;
  const a = dict.account;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<OrderStatus>("processing");
  const [statusDetail, setStatusDetail] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}`);
      const data = (await res.json()) as { order?: OrderDetail; error?: string };
      if (!res.ok || !data.order) {
        setError(data.error ?? "Failed to load order.");
        setOrder(null);
        return;
      }
      setOrder(data.order);
      setStatus(data.order.status);
      setStatusDetail(data.order.statusDetail);
    } catch {
      setError("Failed to load order.");
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          statusDetail,
          staffMessage: staffMessage.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Save failed.");
        return;
      }
      setStaffMessage("");
      setSaved(true);
      await load();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="mt-3 rounded-xl border border-gold/20 bg-ink/40 p-4">
      {loading && <p className="text-sm text-muted">{dict.common.loading}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {order && !loading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted">{formatDate(order.createdAt, locale)}</span>
            <span className="font-semibold text-cream">{formatPrice(order.total, locale)}</span>
          </div>
          <p className="text-xs text-bone">
            {order.customerName} · {order.customerEmail}
            {order.customerPhone && ` · ${order.customerPhone}`}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span>{ad.orderStatus}</span>
              <select className="input" value={status} onChange={(e) => { setStatus(e.target.value as OrderStatus); setSaved(false); }}>
                <option value="paid">Paid</option>
                <option value="processing">{a.statusProcessing}</option>
                <option value="ready">{a.statusReady}</option>
                <option value="delivered">{a.statusDelivered}</option>
                <option value="cancelled">{a.statusCancelled}</option>
              </select>
            </label>
            <label className="field sm:col-span-2">
              <span>{ad.orderStatusDetail}</span>
              <input
                className="input"
                value={statusDetail}
                onChange={(e) => { setStatusDetail(e.target.value); setSaved(false); }}
                placeholder={ad.orderStatusDetailPlaceholder}
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-cream">{ad.orderMessages}</p>
            <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
              {order.messages.length === 0 && <p className="text-xs text-muted">{ad.orderNoMessages}</p>}
              {order.messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 text-sm ${m.author === "staff" ? "bg-gold/10 text-cream" : "bg-ink-soft text-bone"}`}
                >
                  <span className="text-xs text-muted">
                    {m.author === "staff" ? ad.orderStaffLabel : ad.orderCustomerLabel} · {formatDate(m.date, locale)}
                  </span>
                  <p className="mt-1">{m.body}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                value={staffMessage}
                onChange={(e) => setStaffMessage(e.target.value)}
                placeholder={ad.orderReplyPlaceholder}
              />
            </div>
          </div>

          <button type="button" onClick={() => void save()} disabled={saving} className="btn btn-gold text-sm">
            {saving ? dict.common.loading : ad.orderSave}
          </button>
          {saved && <span className="ml-2 text-sm text-ok">✓</span>}
        </div>
      )}
    </div>
  );
}
