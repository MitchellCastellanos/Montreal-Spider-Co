"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import LocaleLink from "@/components/LocaleLink";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useI18n } from "@/i18n/I18nProvider";
import { SITE } from "@/lib/site";
import { withVerifiedOriginLinks } from "@/lib/verified-origin-links";

/** Save your hero image as public/images/hero-editorial.png (or .webp — update HERO_IMAGE). */
const HERO_IMAGE = "/images/hero-editorial.png";
const HERO_FALLBACK = "/images/hero-bg.png";

export default function Hero() {
  const { dict, locale } = useI18n();
  const h = dict.home;
  const [src, setSrc] = useState(HERO_IMAGE);

  return (
    <section className="container-x py-14 md:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="order-2 lg:order-1"
        >
          <span className="badge">{h.heroKicker}</span>

          <h1 className="mt-5 font-display text-4xl font-black leading-[1.08] tracking-tight text-cream sm:text-5xl lg:text-6xl">
            <span className="text-gradient-gold">{h.heroTitle}</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-bone">
            {withVerifiedOriginLinks(h.heroSub, locale)}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LocaleLink href="/shop" className="btn btn-gold text-base">
              {h.heroCta} <span aria-hidden>→</span>
            </LocaleLink>
            <a href={SITE.verifiedOriginUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-base">
              {h.heroCta2}
            </a>
          </div>

          <div className="mt-7">
            <VerifiedBadge label={dict.footer.verifiedBadge} size="lg" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative order-1 aspect-[4/5] overflow-hidden rounded-3xl border border-line shadow-[0_24px_60px_-30px_rgba(20,16,8,0.25)] lg:order-2 lg:aspect-[3/4]"
        >
          <Image
            src={src}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-[68%_38%]"
            onError={() => {
              if (src !== HERO_FALLBACK) setSrc(HERO_FALLBACK);
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
