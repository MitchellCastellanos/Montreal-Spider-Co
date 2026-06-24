"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { VerifiedOriginLink } from "@/lib/verified-origin-links";

export default function HeroStats() {
  const { dict } = useI18n();
  const h = dict.home;

  const stats = [
    { value: "18+", label: h.statSpecies },
    { value: "500+", label: h.statKeepers },
    { value: "100%", label: h.statVerified, link: true },
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
            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">
              {"link" in s && s.link ? (
                <VerifiedOriginLink className="text-muted hover:text-gold-bright">{s.label}</VerifiedOriginLink>
              ) : (
                s.label
              )}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
