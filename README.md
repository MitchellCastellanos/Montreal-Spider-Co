# Montreal Spider Co. 🕷️

The official e-commerce website for **Montreal Spider Co.** — Quebec's premium,
captive-bred tarantula specialist. Bilingual (EN/FR), fully responsive, SEO-optimized,
and built to stand out.

**Live URL:** https://montrealspiderco.ca

---

## ✨ Features

- **Bilingual (English / French)** with locale-prefixed URLs (`/en`, `/fr`),
  automatic language detection, a header language switcher, and full `hreflang`
  alternates for SEO.
- **Rich product catalog** — 18 real tarantula species with detailed specs,
  care snapshots, multiple size/price options and stock levels.
- **Advanced shop** — live filtering (experience level, type, temperament, genus,
  price range, availability), sorting, search, and shareable filtered URLs.
- **Shopping cart** — slide-in drawer + full cart page, persisted in `localStorage`.
- **Checkout** — local Montreal delivery zones (with free-delivery threshold) or
  free pickup points, GST/QST tax estimate, saved or new payment method, and order
  confirmation.
- **User accounts** — sign in/up, profile, order history, saved payment methods,
  and saved addresses (persisted locally).
- **Staff customer lookup** (`/[locale]/admin`) — search customers by phone number
  to review their orders, lifetime value and details.
- **TarantulApp Verified Origin** branding throughout, plus a dedicated explainer page.
- **Content pages** — Home, Shop, Product detail, Care Guides (index + articles),
  Verified Origin, Delivery & Pickup, About, FAQ, Contact.
- **Impressive motion** — Framer Motion animations, scroll reveals, parallax hero,
  animated per-species spider graphics (generated SVG, no photo assets required).
- **SEO** — per-page metadata, canonical + `hreflang`, Open Graph/Twitter cards,
  JSON-LD structured data (Organization, WebSite, Product, BreadcrumbList, FAQPage),
  `sitemap.xml` and `robots.txt`.

## 🧰 Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Framer Motion

## 🚀 Getting started

```bash
npm install
npm run dev      # http://localhost:3000  (redirects to /en)
```

Other scripts:

```bash
npm run build    # production build (static generation for all routes)
npm run start    # serve the production build
npm run lint     # eslint
```

## 📁 Project structure

```
src/
  app/
    [locale]/            # all localized pages (root layout lives here)
      page.tsx           # home
      shop/ product/ care/ verified-origin/ delivery/
      about/ faq/ contact/ cart/ checkout/ account/ admin/
    sitemap.ts robots.ts globals.css
  components/            # UI: Header, Footer, ProductCard, CartDrawer, …
  context/               # CartContext, AuthContext (localStorage-backed)
  i18n/                  # config, dictionaries (en.json / fr.json), providers
  lib/                   # products, locations, customers, care, seo, helpers
  middleware.ts          # locale detection & redirects
public/brand/            # logo assets
```

## 🌐 Internationalization

UI copy lives in `src/i18n/dictionaries/{en,fr}.json`. Domain data (products, care
guides, locations) carries inline `{ en, fr }` fields. To add a language, extend
`src/i18n/config.ts` and add a matching dictionary.

## 🔌 Going to production

This build ships a fully functional storefront with a **demo data layer**: cart,
accounts, saved cards and orders persist in the browser (`localStorage`), and the
admin lookup reads seeded demo customers. No real payments are processed and no card
data is stored. To go live, wire the checkout to a payment provider (e.g. Stripe) and
back the accounts/customers with a real database/CRM — the data modules in `src/lib`
and the contexts in `src/context` are the integration points.

---

© 2026 Montreal Spider Co. · Proudly TarantulApp Verified Origin · Made in Montréal, QC.
