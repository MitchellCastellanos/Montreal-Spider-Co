"use client";

import LocaleLink from "./LocaleLink";
import SpiderGraphic from "./SpiderGraphic";
import { useI18n } from "@/i18n/I18nProvider";

export default function NotFoundContent() {
  const { dict } = useI18n();
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="w-40 animate-floaty opacity-70">
        <SpiderGraphic hue={20} accent="#c2543d" />
      </div>
      <p className="mt-6 font-display text-7xl font-black text-gold/30">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-cream">{dict.notFound.title}</h1>
      <p className="mt-2 text-bone">{dict.notFound.body}</p>
      <LocaleLink href="/" className="btn btn-gold mt-6">{dict.notFound.home}</LocaleLink>
    </div>
  );
}
