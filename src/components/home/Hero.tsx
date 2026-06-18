"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import Image from "next/image";
import LocaleLink from "@/components/LocaleLink";
import SpiderGraphic from "@/components/SpiderGraphic";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useI18n } from "@/i18n/I18nProvider";

export default function Hero() {
  const { dict } = useI18n();
  const h = dict.home;
  const ref = useRef<HTMLDivElement>(null);
  const [heroFailed, setHeroFailed] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const stats = [
    { value: "18+", label: h.statSpecies },
    { value: "500+", label: h.statKeepers },
    { value: "100%", label: h.statVerified },
    { value: "MTL", label: h.statDelivery },
  ];

  return (
    <section ref={ref} className="relative overflow-hidden">
      <Image
        src="/images/hero-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none absolute inset-0 -z-10 object-cover opacity-40"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-ink/60 via-ink/40 to-ink" />
      <div className="web-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -right-40 top-1/2 h-[700px] w-[700px] -translate-y-1/2 rounded-full bg-gold/5 blur-3xl" />

      <div className="container-x relative grid items-center gap-10 py-16 md:py-24 lg:grid-cols-2">
        <motion.div style={{ opacity }} className="relative z-10">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="badge"
          >
            {h.heroKicker}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-5 font-display text-5xl font-black leading-[1.05] tracking-tight text-cream sm:text-6xl lg:text-7xl"
          >
            <span className="text-gradient-gold">{h.heroTitle}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-bone"
          >
            {h.heroSub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <LocaleLink href="/shop" className="btn btn-gold text-base">
              {h.heroCta} <span aria-hidden>→</span>
            </LocaleLink>
            <LocaleLink href="/verified-origin" className="btn btn-ghost text-base">
              {h.heroCta2}
            </LocaleLink>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-7"
          >
            <VerifiedBadge label={dict.footer.verifiedBadge} size="lg" />
          </motion.div>

          <div className="mt-10 grid grid-cols-4 gap-4 border-t border-line pt-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.08 }}
              >
                <p className="font-display text-2xl font-bold text-gold-bright sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div style={{ y }} className="relative mx-auto w-full max-w-md lg:max-w-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
            className="animate-floaty"
          >
            {heroFailed ? (
              <SpiderGraphic hue={36} accent="#e6c882" className="relative w-full drop-shadow-[0_30px_60px_rgba(201,162,75,0.25)]" />
            ) : (
              <div className="relative mx-auto aspect-square w-full">
                <Image
                  src="/images/hero-spider.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 600px"
                  className="object-contain drop-shadow-[0_30px_60px_rgba(201,162,75,0.25)]"
                  onError={() => setHeroFailed(true)}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
