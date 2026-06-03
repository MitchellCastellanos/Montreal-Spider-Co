"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/lib/href";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** A Next.js Link that automatically prefixes the active locale. */
export default function LocaleLink({ href, ...rest }: Props) {
  const { locale } = useI18n();
  return <Link href={localeHref(locale, href)} {...rest} />;
}
