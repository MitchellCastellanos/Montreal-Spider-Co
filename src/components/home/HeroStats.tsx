"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import LocaleLink from "@/components/LocaleLink";

export default function HeroStats() {
  const { dict } = useI18n();
  const h = dict.home;

  const stats = [
    { value: "18+", label: h.statSpecies },
    { value: "100%", label: h.statGuarantee },
    { value: "MTL", label: h.statDelivery },
  ];

  return (
    <section className="border-b border-line bg-ink-soft/70">
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-8 py-10 sm:grid-cols-4 sm:py-12">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.07 }}
            className="text-center sm:text-left"
          >
            <p className="font-display text-2xl font-bold text-gold-bright sm:text-3xl">{s.value}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{s.label}</p>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: stats.length * 0.07 }}
          className="text-center sm:text-left"
        >
          <LocaleLink
            href="/shop"
            className="inline-flex items-center gap-1 font-display text-2xl font-bold text-gold-bright transition-all hover:gap-2 sm:text-3xl"
          >
            {dict.common.shopNow} →
          </LocaleLink>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{h.viewAll}</p>
        </motion.div>
      </div>
    </section>
  );
}
