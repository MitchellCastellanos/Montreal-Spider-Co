"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice, formatDate } from "@/lib/format";

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

export default function AdminLookup() {
  const { dict, locale } = useI18n();
  const ad = dict.admin;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupCustomer[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (q: string) => {
    setQuery(q);
    const digits = q.replace(/\D/g, "");
    if (digits.length < 3) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers?phone=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results: LookupCustomer[] };
      setResults(res.ok ? data.results : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
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
              onChange={(e) => void run(e.target.value)}
              placeholder={ad.searchPlaceholder}
              inputMode="tel"
              autoFocus
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">☎</span>
          </div>
        </label>
        {loading && <p className="mt-3 text-sm text-muted">{dict.common.loading}</p>}
      </div>

      <AnimatePresence mode="wait">
        {results && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 space-y-4"
          >
            <h2 className="font-display text-xl font-bold text-cream">{ad.results}</h2>
            {results.length === 0 ? (
              <p className="text-bone">{ad.noResults}</p>
            ) : (
              results.map((c) => (
                <div key={c.id} className="card-glow rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                    <div>
                      <p className="font-display text-lg font-bold text-cream">{c.name}</p>
                      <p className="text-sm text-bone">{c.email}</p>
                      <p className="text-sm text-gold-bright">{c.phone}</p>
                      {c.city && <p className="text-xs text-muted">{c.city}</p>}
                    </div>
                  </div>
                  {c.orders.length > 0 && (
                    <ul className="mt-4 space-y-3">
                      {c.orders.map((o) => (
                        <li key={o.id} className="rounded-xl border border-line p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-gold-bright">{o.id}</span>
                            <span className="text-muted">{formatDate(o.date, locale)}</span>
                            <span className="badge">{statusLabel(o.status)}</span>
                            <span className="text-cream">{formatPrice(o.total, locale)}</span>
                          </div>
                          <p className="mt-2 text-bone">{o.items.join(" · ")}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
