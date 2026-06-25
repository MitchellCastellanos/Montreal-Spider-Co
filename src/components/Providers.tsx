"use client";

import { I18nProvider, type Dict } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/config";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";

export default function Providers({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  return (
    <I18nProvider locale={locale} dict={dict}>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
