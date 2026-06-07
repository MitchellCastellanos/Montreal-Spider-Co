# Montreal Spider Co. 🕷️

The official e-commerce website for **Montreal Spider Co.** — Quebec's premium,
captive-bred tarantula specialist. Bilingual (EN/FR), fully responsive, SEO-optimized,
and built to stand out.

**Production URL:** https://montrealspiderco.ca
**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion

---

## 🚀 Quick start

```bash
npm install
npm run dev      # http://localhost:3000  → redirects to /en

npm run build    # production build (static generation for all routes)
npm run start    # serve the production build
npm run lint     # eslint
```

---

## 📊 Project status — read this first

This is a **front-end-complete** build. Every feature *works* in the browser, but the
data layer is currently a **demo** (state lives in `localStorage` + seeded files, not a
server). The list below is the single source of truth for what to build next.

### ✅ Done & working

**Storefront**
- 18-species catalog with real tarantula data (specs, care snapshots, sizes/prices, stock, ratings).
- Shop (`/shop`): live filters (experience, type, temperament, genus, price, in-stock), sorting, search, **shareable filtered URLs**.
- Product pages (`/product/[slug]`): size selector, quantity, add-to-cart, care snapshot, related species.
- Cart: slide-in drawer + full cart page (persisted in `localStorage`).
- Checkout: Montreal **delivery zones** + free **pickup points**, free-delivery threshold, **GST + QST** estimate, saved/new payment method, order confirmation.

**Accounts & staff**
- User accounts: sign in/up, profile, order history, **saved cards & addresses** (in `localStorage`).
- Staff customer lookup (`/admin`): search customers **by phone number** → orders, lifetime value, status.

**Brand, content & i18n**
- TarantulApp **Verified Origin** badge throughout + dedicated page (`/verified-origin`).
- Pages: Home, Shop, Product, Care Guides (index + 5 articles), Verified Origin, Delivery & Pickup, About, FAQ, Contact.
- **Bilingual EN/FR**: locale-prefixed routes (`/en`, `/fr`), auto-detection (cookie + `Accept-Language`), language switcher, full `hreflang` alternates.

**Motion & SEO**
- Framer Motion: parallax hero, scroll reveals, animated header, cart/menu transitions.
- Generated per-species spider SVGs (unique color per species — no photo assets yet).
- SEO: per-page metadata, canonical + `hreflang`, Open Graph/Twitter, **JSON-LD** (Organization, WebSite, Product, BreadcrumbList, FAQPage), `sitemap.xml`, `robots.txt`.

### ⚠️ Demo — needs a real backend before launch

| Area | Current (demo) | Needed for production | Integration point |
|---|---|---|---|
| **Payments** | Checkout validates but **processes no real payment**; no card data stored | Stripe: payment intents, webhooks, receipts | `src/components/checkout/CheckoutView.tsx` |
| **Auth / accounts** | Any email + password "signs in"; data per-browser | Real auth (NextAuth/Clerk/Supabase) + server sessions | `src/context/AuthContext.tsx` |
| **Orders & cart** | `localStorage` only | Persist in a database; confirmation emails | `src/context/CartContext.tsx`, `AuthContext.tsx` |
| **Customer lookup** | Seeded demo data | Connect real database / CRM | `src/lib/customers.ts` |
| **Inventory / stock** | Static numbers | DB-backed stock + admin editing | `src/lib/products.ts` |
| **Contact / newsletter** | Forms show success but **don't send** | Email service (Resend/SendGrid) + newsletter | `ContactForm.tsx`, `Newsletter.tsx` |
| **Product images** | Stylized generated SVGs | Real specimen photos | `src/components/SpiderGraphic.tsx`, `src/lib/products.ts` |

### 📋 Suggested next steps (priority order)
1. **Payments** — Stripe checkout + webhooks (the launch blocker).
2. **Database + real auth** — back accounts, orders and the customer lookup.
3. **Admin dashboard** — inventory / orders / status management (extend `/admin`).
4. **Email** — order confirmations, contact form, newsletter.
5. **Real product photography** — swap the generated SVGs.
6. **Deploy** — Vercel + the `montrealspiderco.ca` domain (see below — already done if this is live).

---

## ☁️ Deploy to Vercel + connect `montrealspiderco.ca`

The repo is Vercel-ready: `vercel.json` pins the framework, build command and the
Montreal region (`yul1`), and `NEXT_PUBLIC_SITE_URL` makes canonical/OG/sitemap URLs
environment-aware. There is **nothing to configure in code** — these are dashboard steps.

### 1. Create the Vercel project
1. Go to <https://vercel.com/new> and **import** the GitHub repo `MitchellCastellanos/Montreal-Spider-Co`.
2. Framework preset: **Next.js** (auto-detected). Leave build/install commands as-is.
3. Add an Environment Variable:
   - `NEXT_PUBLIC_SITE_URL` = `https://montrealspiderco.ca`
4. **Deploy.** You'll get a `*.vercel.app` URL to verify the build.

> Prefer the CLI? `npm i -g vercel`, then `vercel` (preview) and `vercel --prod`.

### 2. Add the custom domain
In **Vercel → Project → Settings → Domains**, add both:
- `montrealspiderco.ca`
- `www.montrealspiderco.ca`

Vercel will show the exact records to add at your domain registrar. The standard setup is:

| Type  | Name / Host | Value |
|-------|-------------|-------|
| `A`     | `@` (apex)  | `76.76.21.21` |
| `CNAME` | `www`       | `cname.vercel-dns.com` |

Then set `www` to **redirect to** `montrealspiderco.ca` (or vice-versa) in the Domains panel.

> ℹ️ Vercel may display a different IP/CNAME for your project — **always use the values
> Vercel shows you**, not these, if they differ. Alternatively, point your domain's
> **nameservers** to Vercel for fully automatic DNS.

### 3. After DNS propagates (minutes–hours)
- Vercel issues the SSL certificate automatically (HTTPS).
- Confirm `https://montrealspiderco.ca` → redirects to `/en` (or `/fr` by browser language).
- Re-deploys happen automatically on every push to the production branch.

---

## ⚙️ Environment variables

Copy `.env.example` → `.env.local` for local dev (and mirror the keys in Vercel).
Only `NEXT_PUBLIC_SITE_URL` is used today; the rest are commented placeholders for the
production integrations above.

| Variable | Used now? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✅ | Canonical/OG/sitemap base URL |
| `STRIPE_*` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⛔ placeholder | Payments |
| `DATABASE_URL` | ⛔ placeholder | Orders / accounts / customers |
| `AUTH_SECRET` | ⛔ placeholder | Auth |
| `RESEND_API_KEY` | ⛔ placeholder | Email / newsletter |

---

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
  lib/                   # products, locations, customers, care, seo, site config
  middleware.ts          # locale detection & redirects
public/brand/            # logo assets used by the app
.design-assets/          # original brand references (logo + infographic) you provided
vercel.json              # Vercel deploy config (framework, region yul1)
.env.example             # environment variable template
```

## 🌐 Adding / editing content

- **UI copy:** `src/i18n/dictionaries/{en,fr}.json` (keep keys in sync across both).
- **Products:** `src/lib/products.ts` (each carries inline `{ en, fr }` fields).
- **Care guides:** `src/lib/care.ts` · **Delivery zones / pickup points:** `src/lib/locations.ts`.
- **Demo customers (admin lookup):** `src/lib/customers.ts`.
- **Global config (URL, email, tax rate, socials):** `src/lib/site.ts`.

---

© 2026 Montreal Spider Co. · Proudly TarantulApp Verified Origin · Made in Montréal, QC.
