"use client";

import { useState } from "react";
import Image from "next/image";
import LocaleLink from "./LocaleLink";
import VerifiedBadge from "./VerifiedBadge";
import { useI18n } from "@/i18n/I18nProvider";
import { SITE } from "@/lib/site";

export default function Footer() {
  const { dict } = useI18n();
  const [subscribed, setSubscribed] = useState(false);
  const f = dict.footer;
  const year = new Date().getFullYear();

  return (
    <footer className="hairline mt-24 bg-ink-soft/60">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <LocaleLink href="/" className="flex items-center gap-3">
              <span className="relative h-12 w-12">
                <Image src="/brand/logo.png" alt={dict.meta.siteName} fill sizes="48px" className="object-contain" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-lg font-bold text-cream">MONTREAL</span>
                <span className="font-display text-sm tracking-[0.3em] text-gold-bright">SPIDER CO.</span>
              </span>
            </LocaleLink>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-bone">{f.blurb}</p>
            <div className="mt-5">
              <VerifiedBadge label={f.verifiedBadge} />
            </div>

            <form
              className="mt-6 max-w-sm"
              onSubmit={(e) => {
                e.preventDefault();
                setSubscribed(true);
              }}
            >
              <label className="field" htmlFor="footer-news">
                <span>{dict.common.newsletter}</span>
              </label>
              {subscribed ? (
                <p className="text-sm text-ok">{dict.home.newsletterThanks}</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    id="footer-news"
                    type="email"
                    required
                    placeholder={dict.home.newsletterPlaceholder}
                    className="input"
                  />
                  <button className="btn btn-gold shrink-0">{dict.home.newsletterButton}</button>
                </div>
              )}
            </form>
          </div>

          <FooterCol title={f.shopCol}>
            <LocaleLink href="/shop" className="footer-link">{f.allSpecies}</LocaleLink>
            <LocaleLink href="/shop?experience=beginner" className="footer-link">{f.beginnerSpiders}</LocaleLink>
            <LocaleLink href="/shop?sort=newest" className="footer-link">{f.newArrivals}</LocaleLink>
            <LocaleLink href="/delivery" className="footer-link">{dict.nav.delivery}</LocaleLink>
          </FooterCol>

          <FooterCol title={f.learnCol}>
            <LocaleLink href="/care" className="footer-link">{dict.nav.care}</LocaleLink>
            <LocaleLink href="/verified-origin" className="footer-link">{dict.nav.verified}</LocaleLink>
            <LocaleLink href="/faq" className="footer-link">{dict.nav.faq}</LocaleLink>
          </FooterCol>

          <FooterCol title={f.companyCol}>
            <LocaleLink href="/about" className="footer-link">{dict.nav.about}</LocaleLink>
            <LocaleLink href="/contact" className="footer-link">{dict.nav.contact}</LocaleLink>
            <LocaleLink href="/account" className="footer-link">{dict.nav.account}</LocaleLink>
            <a href={`mailto:${SITE.email}`} className="footer-link">{SITE.email}</a>
          </FooterCol>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center">
          <p>
            © {year} {dict.meta.siteName}. {f.rights}
          </p>
          <p className="text-gold-deep">{f.madeIn}</p>
          <div className="flex items-center gap-4">
            <LocaleLink href="/terms" className="footer-link">{f.legalTerms}</LocaleLink>
            <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" className="footer-link">Instagram</a>
            <a href={SITE.social.facebook} target="_blank" rel="noopener noreferrer" className="footer-link">Facebook</a>
            <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" className="footer-link">TikTok</a>
            <LocaleLink href="/admin" className="footer-staff-link" title={f.staffLogin}>
              {f.staffLogin}
            </LocaleLink>
          </div>
        </div>
      </div>

      <style>{`
        .footer-link { display:block; color: var(--bone); font-size: .9rem; padding: .25rem 0; transition: color .2s, transform .2s; }
        .footer-link:hover { color: var(--gold-bright); transform: translateX(2px); }
        .footer-staff-link { font-size: .75rem; color: color-mix(in srgb, var(--muted) 55%, transparent); transition: color .2s; }
        .footer-staff-link:hover { color: var(--muted); }
      `}</style>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-display text-sm uppercase tracking-wider text-cream">{title}</h3>
      <div>{children}</div>
    </div>
  );
}
