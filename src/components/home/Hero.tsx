"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import Image from "next/image";
import LocaleLink from "@/components/LocaleLink";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useI18n } from "@/i18n/I18nProvider";

/** Save your hero image as public/images/hero-editorial.png (or .webp — update HERO_IMAGE). */
const HERO_IMAGE = "/images/hero-editorial.png";
const HERO_FALLBACK = "/images/hero-bg.png";

export default function Hero() {
  const { dict } = useI18n();
  const h = dict.home;
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState(HERO_IMAGE);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[88vh] overflow-hidden md:min-h-[92vh]">
      <motion.div style={{ scale }} className="absolute inset-0 will-change-transform">
        <Image
          src={src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_center] md:object-[65%_center] lg:object-center"
          onError={() => {
            if (src !== HERO_FALLBACK) setSrc(HERO_FALLBACK);
          }}
        />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink from-30% via-ink/90 via-55% to-ink/15" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-ink/40" />

      <motion.div
        style={{ opacity }}
        className="container-x relative flex min-h-[88vh] flex-col justify-center py-28 md:min-h-[92vh] md:py-32"
      >
        <div className="max-w-2xl">
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
        </div>
      </motion.div>
    </section>
  );
}
