# Connecting the database, image storage & admin panel (Neon + Cloudinary)

The site runs fine **without** any of this — it falls back to the built-in seed
catalog. Follow these steps to switch to a real database so the **admin panel**
(`/en/admin`) can add, edit and delete products, upload photos, and have them show
on the live site.

- **Database:** [Neon](https://neon.tech) (serverless Postgres)
- **Image storage:** [Cloudinary](https://cloudinary.com) (image CDN)

Time: ~15 minutes.

---

## 1. Create a Neon database
1. Go to <https://neon.tech> → sign in → **Create project**.
   - Name: `montreal-spider-co`. Pick a region near Montreal (e.g. `AWS us-east-1`).
2. After it's created, click **Connect** (top of the dashboard).
3. Copy **two** connection strings:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   - **Direct** (same host without `-pooler`) → `DIRECT_URL`
   - Both should end with `?sslmode=require` (Neon includes it).
   - Tip: the **Connect → "Prisma"** snippet shows both ready to paste.

> ```
> DATABASE_URL = postgresql://user:pass@ep-xxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
> DIRECT_URL   = postgresql://user:pass@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
> ```

## 2. Create a Cloudinary account (image hosting)
1. Go to <https://cloudinary.com> → sign up (free tier is plenty).
2. On the **Dashboard**, find **Product Environment Credentials** and copy:
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET` (⚠️ keep secret, server-only)

## 3. Pick your admin secrets
- `ADMIN_PASSWORD` — the password to log into `/admin`.
- `AUTH_SECRET` — any long random string. Generate one:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

## 4. Create `.env.local`
Copy `.env.example` → `.env.local` and fill in everything from steps 1–3.

## 5. Create the tables and seed the catalog
From the project root:
```bash
npm install
npm run db:push     # creates the Product / ProductSize tables in Neon
npm run db:seed     # loads the 18 starter species
```
You should see `Seed complete.` (Browse data anytime with `npm run db:studio`.)

## 6. Run it
```bash
npm run dev
```
- Visit `/en/admin` → sign in with `ADMIN_PASSWORD`.
- **Products** → add/edit/delete, upload a photo per species (goes to Cloudinary).
- **Customers** → look up customers by phone.

---

## Deploying to Vercel
Add **all** the same variables in **Vercel → Project → Settings → Environment
Variables** (Production + Preview), then redeploy.

- Use `NEXT_PUBLIC_SITE_URL=https://montrealspiderco.ca` in production (not localhost).
- `npm run build` runs `prisma generate` automatically (via `postinstall`).
- Run `npm run db:push` and `npm run db:seed` once against the production
  `DATABASE_URL` (e.g. from your machine with the prod values) to create + seed the tables.
- Product pages use ISR (`revalidate = 60`): admin changes appear within ~1 minute;
  brand-new products render on demand immediately.

## Notes & security
- Admin uses a simple password gate with a signed, http-only session cookie — fine
  for a single operator. For multiple staff, swap in a real auth provider later
  (the gate lives in `src/lib/auth.ts`).
- The Cloudinary API secret is only used server-side (`src/lib/storage.ts`). Never
  put it in a `NEXT_PUBLIC_` variable.
- Without `DATABASE_URL`, the admin shows the seed catalog read-only and the storefront
  keeps working from the seed — nothing breaks.

## What still needs wiring (next)
- **Checkout → real orders**: persist orders to the DB + Stripe payments.
- **Customer lookup**: point `src/lib/customers.ts` at the real customers/orders tables.
