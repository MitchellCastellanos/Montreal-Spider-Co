"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice, formatDate } from "@/lib/format";
import AdminOrderPanel from "@/components/admin/AdminOrderPanel";

interface LookupCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  verified: boolean;
  orders: {
    id: string;
    date: string;
    total: number;
    status: string;
    items: string[];
  }[];
}

function matchesQuery(c: LookupCustomer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = query.replace(/\D/g, "");
  return (
    c.name.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    (digits.length > 0 && c.phone.replace(/\D/g, "").includes(digits))
  );
}

export default function AdminLookup() {
  const { dict, locale } = useI18n();
  const ad = dict.admin;
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<LookupCustomer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/customers");
        const data = (await res.json()) as { results: LookupCustomer[] };
        if (!cancelled) setCustomers(res.ok ? data.results : []);
      } catch {
        if (!cancelled) setCustomers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => customers.filter((c) => matchesQuery(c, query)), [customers, query]);

  const statusLabel = (s: string) =>
    s === "delivered" ? dict.account.statusDelivered : s === "ready" ? dict.account.statusReady : dict.account.statusProcessing;

  return (
    <div className="container-x py-12">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold-bright">⚙</span>
        <h1 className="font-display text-3xl font-bold text-cream">{ad.title}</h1>
      </div>
      <p className="mb-6 max-w-2xl text-bone">{ad.subtitle}</p>

      <div className="card-glow rounded-2xl p-5">
        <label className="field">
          <span>{ad.searchLabel}</span>
          <div className="relative">
            <input
              className="input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ad.searchPlaceholder}
              autoFocus
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
          </div>
        </label>
        {loading && <p className="mt-3 text-sm text-muted">{dict.common.loading}</p>}
      </div>

      {!loading && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-cream">{ad.customerList}</h2>
            <p className="text-sm text-muted">
              {filtered.length} / {customers.length} {ad.totalCustomers}
            </p>
          </div>

          {customers.length === 0 ? (
            <p className="text-bone">{ad.noCustomers}</p>
          ) : filtered.length === 0 ? (
            <p className="text-bone">{ad.noResults}</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((c) => {
                const isSelected = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(isSelected ? null : c.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-gold/50 bg-gold/10 ring-1 ring-gold/30"
                          : "border-line bg-ink-soft/30 hover:border-gold/30 hover:bg-ink-soft/60"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-lg font-bold text-cream">{c.name}</p>
                          <p className="text-sm text-bone">{c.email}</p>
                          {c.phone && <p className="text-sm text-gold-bright">{c.phone}</p>}
                          {c.city && <p className="text-xs text-muted">{c.city}</p>}
                        </div>
                        <div className="text-right text-sm text-muted">
                          <p>
                            {c.orders.length} {ad.orders.toLowerCase()}
                          </p>
                          {c.orders[0] && (
                            <p>
                              {ad.lastOrder}: {formatDate(c.orders[0].date, locale)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 rounded-2xl border border-line bg-ink-soft/20 p-5">
                            {c.orders.length === 0 ? (
                              <p className="text-sm text-bone">{ad.noOrders}</p>
                            ) : (
                              <ul className="space-y-3">
                                {c.orders.map((o) => (
                                  <li key={o.id} className="rounded-xl border border-line p-3 text-sm">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                                      className="w-full text-left"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-semibold text-gold-bright">{o.id}</span>
                                        <span className="text-muted">{formatDate(o.date, locale)}</span>
                                        <span className="badge">{statusLabel(o.status)}</span>
                                        <span className="text-cream">{formatPrice(o.total, locale)}</span>
                                      </div>
                                      <p className="mt-2 text-bone">{o.items.join(" · ")}</p>
                                      <p className="mt-1 text-xs text-gold-deep">
                                        {expandedOrder === o.id ? ad.orderCollapse : ad.orderManage}
                                      </p>
                                    </button>
                                    <AdminOrderPanel orderNumber={o.id} open={expandedOrder === o.id} />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
