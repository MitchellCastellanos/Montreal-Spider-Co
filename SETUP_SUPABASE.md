# Connecting the database, image storage & admin panel (Supabase)

The site runs fine **without** any of this — it falls back to the built-in seed
catalog. Follow these steps to switch to a real database so the **admin panel**
(`/en/admin`) can add, edit and delete products, upload photos, and have them show
on the live site.

Time: ~15 minutes.

---

## 1. Create a Supabase project
1. Go to <https://supabase.com> → **New project**. Pick a name, a strong database
   password (save it), and a region close to Montreal (e.g. `us-east-1`).
2. Wait for it to finish provisioning.

## 2. Get your connection strings & keys
- **Project Settings → Database → Connection string → "URI"**
  - Copy the **pooled** string (host contains `pooler`, port `6543`) → `DATABASE_URL`
    (append `?pgbouncer=true` if not present).
  - Copy the **direct** string (port `5432`) → `DIRECT_URL`.
  - Replace `[YOUR-PASSWORD]` with your database password in both.
- **Project Settings → API**
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ server-only, never expose)

## 3. Create the image bucket
- **Storage → Create a new bucket** → name it `product-images` → mark it **Public**.

## 4. Set environment variables
Copy `.env.example` → `.env.local` and fill in everything from steps 2–3, plus:
- `ADMIN_PASSWORD` — the password to log into `/admin`.
- `AUTH_SECRET` — any long random string (e.g. run `openssl rand -hex 32`).

## 5. Create the tables and seed the catalog
From the project root:
```bash
npm install
npm run db:push     # creates the Product / ProductSize tables from prisma/schema.prisma
npm run db:seed     # loads the 18 starter species into the database
```
(You can browse/edit data anytime with `npm run db:studio` or the Supabase Table editor.)

## 6. Run it
```bash
npm run dev
```
- Visit `/en/admin` → sign in with `ADMIN_PASSWORD`.
- **Products** tab → add/edit/delete, upload a photo per species.
- **Customers** tab → look up customers by phone.

---

## Deploying to Vercel
Add **all** the same variables in **Vercel → Project → Settings → Environment
Variables** (Production + Preview), then redeploy.

- `npm run build` runs `prisma generate` automatically (via `postinstall`).
- The first deploy: run `npm run db:push` and `npm run db:seed` once (locally,
  pointing at the same `DATABASE_URL`, or via the Supabase SQL editor) to create
  and seed the tables.
- Product pages use ISR (`revalidate = 60`), so admin changes appear within ~1 minute;
  new products render on demand immediately.

## Notes & security
- The admin uses a simple password gate with a signed, http-only session cookie —
  good enough for a single operator. For multiple staff accounts, swap in Supabase
  Auth later (the gate lives in `src/lib/auth.ts`).
- The `service_role` key is only used server-side (`src/lib/supabaseAdmin.ts`) for
  uploads. Never put it in a `NEXT_PUBLIC_` variable.
- Without `DATABASE_URL`, the admin shows the seed catalog read-only and the storefront
  keeps working from the seed — nothing breaks.

## What still needs wiring (next)
- **Checkout → real orders**: persist orders to the DB + Stripe payments.
- **Customer lookup**: point `src/lib/customers.ts` at the real customers/orders tables.
