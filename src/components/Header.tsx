"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import LocaleLink from "./LocaleLink";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { dict, locale } = useI18n();
  const { count, openCart } = useCart();
  const { user } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Close the mobile menu whenever the route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  const nav = [
    { href: "/shop", label: dict.nav.shop },
    { href: "/care", label: dict.nav.care },
    { href: "/verified-origin", label: dict.nav.verified },
    { href: "/delivery", label: dict.nav.delivery },
    { href: "/about", label: dict.nav.about },
    { href: "/faq", label: dict.nav.faq },
    { href: "/contact", label: dict.nav.contact },
  ];

  const isActive = (href: string) => pathname.startsWith(`/${locale}${href}`);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-line bg-ink/90 backdrop-blur-md py-2"
          : "border-b border-transparent bg-transparent py-3"
      }`}
    >
      <div className="container-x flex items-center justify-between gap-4">
        <LocaleLink href="/" className="flex items-center gap-3 group">
          <span className="relative inline-block h-11 w-11 shrink-0 transition-transform duration-500 group-hover:rotate-[8deg]">
            <Image src="/brand/logo.png" alt={dict.meta.siteName} fill sizes="44px" className="object-contain" priority />
          </span>
          <span className="hidden sm:flex flex-col leading-none">
            <span className="font-display text-base font-bold tracking-wide text-cream">MONTREAL</span>
            <span className="font-display text-sm tracking-[0.35em] text-gold-bright">SPIDER CO.</span>
          </span>
        </LocaleLink>

        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((item) => (
            <LocaleLink
              key={item.href}
              href={item.href}
              className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href) ? "text-gold-bright" : "text-bone hover:text-cream"
              }`}
            >
              {item.label}
              {isActive(item.href) && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-gold"
                />
              )}
            </LocaleLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher compact />

          <LocaleLink
            href="/account"
            aria-label={dict.nav.account}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-bone transition hover:border-gold hover:text-gold-bright"
            title={user ? user.name : dict.account.signIn}
          >
            <UserIcon />
          </LocaleLink>

          <button
            onClick={openCart}
            aria-label={dict.nav.cart}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-bone transition hover:border-gold hover:text-gold-bright"
          >
            <CartIcon />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={dict.nav.menu}
            aria-expanded={menuOpen}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-bone hover:border-gold hover:text-gold-bright"
          >
            {menuOpen ? "×" : <MenuIcon />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden border-t border-line bg-ink/95 backdrop-blur"
          >
            <div className="container-x flex flex-col py-3">
              {nav.map((item) => (
                <LocaleLink
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-3 text-base ${
                    isActive(item.href) ? "text-gold-bright" : "text-bone"
                  }`}
                >
                  {item.label}
                </LocaleLink>
              ))}
              <LocaleLink href="/account" className="rounded-md px-3 py-3 text-base text-bone">
                {dict.nav.account}
              </LocaleLink>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M2 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 7H5.2" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
