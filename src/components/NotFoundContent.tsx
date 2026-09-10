"use client";

import Image from "next/image";
import LocaleLink from "./LocaleLink";
import { useI18n } from "@/i18n/I18nProvider";

export default function NotFoundContent() {
  const { dict } = useI18n();
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line">
        <Image
          src="/images/error-404.png"
          alt=""
          width={1672}
          height={941}
          priority
          className="w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
      </div>
      <p className="mt-6 font-display text-7xl font-black text-gold/30">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-cream">{dict.notFound.title}</h1>
      <p className="mt-2 text-bone">{dict.notFound.body}</p>
      <LocaleLink href="/" className="btn btn-gold mt-6">{dict.notFound.home}</LocaleLink>
    </div>
  );
}
