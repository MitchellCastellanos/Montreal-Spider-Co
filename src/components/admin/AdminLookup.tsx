"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice, formatDate } from "@/lib/format";
import {
  CUSTOMERS,
  lastOrderDate,
  lifetimeValue,
  searchCustomersByPhone,
  type Customer,
} from "@/lib/customers";

export default function AdminLookup() {
  const { dict, locale } = useI18n();
  const ad = dict.admin;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[] | null>(null);

  const run = (q: string) => {
    setQuery(q);
    setResults(q.replace(/\D/g, "").length >= 3 ? searchCustomersByPhone(q) : null);
  };

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
              onChange={(e) => run(e.target.value)}
              placeholder={ad.searchPlaceholder}
              inputMode="tel"
              autoFocus
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">☎</span>
          </div>
        </label>
        <p className="mt-2 text-xs text-muted">{CUSTOMERS.length} {ad.totalCustomers}</p>
      </div>

      <AnimatePresence mode="wait">
        {results !== null && (
          <motion.div
            key={query}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6"
          >
            {results.length === 0 ? (
              <div className="rounded-2xl border border-line bg-ink-soft/40 p-10 text-center text-bone">{ad.noResults}</div>
            ) : (
              <div className="space-y-5">
                <p className="text-sm text-muted">{ad.results}: {results.length}</p>
                {results.map((c) => (
                  <div key={c.id} className="card-glow rounded-2xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-xl font-bold text-cream">{c.name}</h2>
                          {c.verified && <span className="badge">✓ {ad.verified}</span>}
                        </div>
                        <p className="mt-1 text-sm text-bone">{c.phone} · {c.email}</p>
                        <p className="text-sm text-muted">{c.city}</p>
                      </div>
                      <div className="flex gap-6 text-right">
                        <Stat label={ad.orders} value={String(c.orders.length)} />
                        <Stat label={ad.lifetime} value={formatPrice(lifetimeValue(c), locale)} />
                        <Stat label={ad.lastOrder} value={lastOrderDate(c) ? formatDate(lastOrderDate(c)!, locale) : "—"} />
                      </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-line">
                          {c.orders.map((o) => (
                            <tr key={o.id} className="text-bone">
                              <td className="py-2 pr-4 font-medium text-gold-bright">{o.id}</td>
                              <td className="py-2 pr-4">{formatDate(o.date, locale)}</td>
                              <td className="py-2 pr-4"><span className="badge">{statusLabel(o.status)}</span></td>
                              <td className="py-2 pr-4 text-muted">{o.items.join(", ")}</td>
                              <td className="py-2 text-right font-semibold text-cream">{formatPrice(o.total, locale)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-8 rounded-lg border border-line bg-ink-soft/60 p-3 text-xs text-muted">{ad.demoNote}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display text-lg font-bold text-cream">{value}</p>
    </div>
  );
}
