"use client";

import { usePathname } from "next/navigation";

/** Applies the light editorial theme on the homepage; every other route keeps the dark theme. */
export default function ThemeScope({ locale, children }: { locale: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === `/${locale}`;
  return <div className={isHome ? "theme-light" : undefined}>{children}</div>;
}
