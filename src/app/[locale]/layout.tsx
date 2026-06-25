import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { SITE } from "@/lib/site";
import { localeHref } from "@/lib/href";
import Providers from "@/components/Providers";
import ThemeScope from "@/components/ThemeScope";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: `${dict.meta.siteName} — ${dict.meta.tagline}`,
      template: `%s · ${dict.meta.siteName}`,
    },
    description: dict.meta.defaultDescription,
    applicationName: dict.meta.siteName,
    keywords:
      loc === "fr"
        ? ["mygales Montréal", "tarentule Québec", "acheter mygale", "Origine Vérifiée", "TarantulApp", "élevage mygale"]
        : ["tarantulas Montreal", "buy tarantula Canada", "tarantula shop Quebec", "Verified Origin", "TarantulApp", "captive bred tarantula"],
    authors: [{ name: dict.meta.siteName }],
    alternates: {
      canonical: localeHref(loc, "/"),
      languages: {
        en: "/en",
        fr: "/fr",
        "x-default": "/en",
      },
    },
    openGraph: {
      type: "website",
      siteName: dict.meta.siteName,
      title: `${dict.meta.siteName} — ${dict.meta.tagline}`,
      description: dict.meta.defaultDescription,
      url: localeHref(loc, "/"),
      locale: loc === "fr" ? "fr_CA" : "en_CA",
      images: [{ url: "/og/og-image.png", width: 1200, height: 630, alt: dict.meta.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${dict.meta.siteName} — ${dict.meta.tagline}`,
      description: dict.meta.defaultDescription,
      images: ["/og/og-image.png"],
    },
    // Favicon/app icons are auto-detected from src/app/icon.png & apple-icon.png
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body>
        <JsonLd data={organizationSchema(dict)} />
        <JsonLd data={websiteSchema(dict)} />
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-gold focus:px-4 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <Providers locale={locale} dict={dict}>
          <ThemeScope locale={locale}>
            <Header />
            <main id="main">{children}</main>
            <Footer />
          </ThemeScope>
        </Providers>
      </body>
    </html>
  );
}
