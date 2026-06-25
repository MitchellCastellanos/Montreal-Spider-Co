"use client";

import { usePathname } from "next/navigation";
import CartDrawer from "./CartDrawer";

/** Applies the light editorial theme on home, shop and product pages; every other route keeps the dark theme. */
export default function ThemeScope({ locale, children }: { locale: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isLight =
    pathname === `/${locale}` ||
    pathname === `/${locale}/shop` ||
    pathname.startsWith(`/${locale}/product/`);
  return (
    <div className={isLight ? "theme-light" : undefined}>
      {children}
      <CartDrawer />
    </div>
  );
}
