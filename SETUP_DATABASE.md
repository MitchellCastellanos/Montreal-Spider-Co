# Connecting the database, image storage & admin panel (Neon + Cloudinary)

The site runs fine **without** any of this — it falls back to the built-in seed
catalog. Follow these steps to switch to a real database so the **admin panel**
(`/en/admin`) can add, edit and delete products, upload photos, and have them show
on the live site.

- **Database:** [Neon](https://neon.tech) (serverless Postgres)
- **Image storage:** [Cloudinary](https://cloudinary.com) (image CDN)

Time: ~15 minutes.

---

## 👉 Empieza aquí (estado al 18 jun 2026)

**Archivo a editar:** `.env.local` (raíz del proyecto — ya existe, no lo subas a git).

**Neon conectado:** org `GABAN Solutions` · proyecto `gentle-rain-73332177` · 18 especies en DB ✅

| Paso | Qué | Estado |
|------|-----|--------|
| 0 | Código en `main` (Prisma + Cloudinary + admin) | ✅ listo |
| 1 | `npm install` | ✅ listo |
| 2 | `.env.local` + `AUTH_SECRET` | ✅ listo |
| 3 | Neon: `DATABASE_URL` + `DIRECT_URL` | ✅ listo |
| 4 | `db:push` + `db:seed` (tablas + 18 especies) | ✅ listo |
| 5 | Cloudinary: `CLOUDINARY_*` en `.env.local` | ✅ listo |
| 6 | `ADMIN_PASSWORD` en `.env.local` | ✅ listo |
| 7 | `npm run dev` → probar `/en/admin` | ✅ dev server corriendo |

### Todo conectado — prueba manual

1. Abre **http://localhost:3000/en/shop** — 18 especies desde Neon.
2. Abre **http://localhost:3000/en/admin** — login con tu `ADMIN_PASSWORD`.
3. **Products** → edita una especie y sube una foto (va a Cloudinary).

> Los comandos `npm run db:*` leen `.env.local` automáticamente (vía `dotenv-cli`).

---

## 3. Neon — conexión a la base de datos

Ya instalaste el plugin de Neon en Cursor. Úsalo así (más rápido que el dashboard web):

1. **Reload Cursor** (`Developer: Reload Window`) para activar MCP + extensión.
2. Abre el panel **Neon** en la barra lateral (ícono de Postgres).
3. Inicia sesión → org **GABAN Solutions** (ya te autenticaste una vez; solo falta el proyecto).
4. **Create project** → nombre `montreal-spider-co`, región cerca de Montreal (ej. `us-east-1`).
5. **Connect** → snippet **Prisma** → copia:
   - **Pooled** (host con `-pooler`) → `DATABASE_URL` en `.env.local`
   - **Direct** (mismo host, sin `-pooler`) → `DIRECT_URL` en `.env.local`

Opcional (configura MCP + skills de una vez):

```bash
npx neonctl@latest init
```

Sigue el login en el browser. Puede escribir `DATABASE_URL` por ti; igual necesitas pegar `DIRECT_URL` del mismo snippet Prisma.

> **Prisma necesita dos URLs.** `DATABASE_URL` = pooled (runtime). `DIRECT_URL` = direct (`db:push` / migraciones). Ambas terminan en `?sslmode=require`.

**Dashboard web (alternativa):** [Neon por dashboard](#neon--dashboard-web-alternativa) al final.

---

## 4. Cloudinary — fotos de producto

1. Ve a <https://cloudinary.com> → regístrate (free tier alcanza).
2. En el **Dashboard** → **Product Environment Credentials** → pega en `.env.local`:
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET` (⚠️ solo servidor, nunca `NEXT_PUBLIC_`)
3. `CLOUDINARY_FOLDER` ya tiene default (`montreal-spider-co/products`) — déjalo así.

## 5. Admin — contraseña de entrada

En `.env.local`:

- `ADMIN_PASSWORD` — la contraseña que usarás en `/en/admin` (tú la eliges).
- `AUTH_SECRET` — **ya está generado** en tu `.env.local`. No lo cambies salvo que quieras invalidar sesiones.

## 6. Crear tablas + seed (lo hace el agente en Cursor)

Cuando hayas llenado `.env.local` y digas *listo we ya quedó*, desde la raíz del proyecto:

```bash
npm run db:push     # crea tablas Product / ProductSize en Neon
npm run db:seed     # carga las 18 especies iniciales
```

Debe decir `Seed complete.` (explorar datos: `npm run db:studio`).

## 7. Probar (también lo hace el agente)

```bash
npm run dev
```

- **http://localhost:3000/en/admin** → login con `ADMIN_PASSWORD`.
- **Products** → crear/editar/borrar, subir foto (va a Cloudinary).
- **Customers** → buscar por teléfono (demo por ahora).

---

## Neon — dashboard web (alternativa)

Si no usas el plugin de Cursor:

1. Ve a <https://neon.tech> → inicia sesión → **Create project**.
   - Nombre: `montreal-spider-co`. Región cerca de Montreal (ej. `AWS us-east-1`).
2. **Connect** (arriba en el dashboard) → snippet **Prisma**.
3. Copia **Pooled** → `DATABASE_URL` y **Direct** → `DIRECT_URL` en `.env.local`.

> ```
> DATABASE_URL = postgresql://user:pass@ep-xxxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
> DIRECT_URL   = postgresql://user:pass@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
> ```

---

## Referencia: `.env.local` completo

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000

DATABASE_URL="..."   # pooled (Neon)
DIRECT_URL="..."     # direct (Neon)

CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
CLOUDINARY_FOLDER="montreal-spider-co/products"

ADMIN_PASSWORD="tu-contraseña"
AUTH_SECRET="..."    # ya generado en tu máquina
```

---

## Deploying to Vercel
Add **all** the same variables in **Vercel → Project → Settings → Environment
Variables** (Production + Preview), then redeploy.

- Use `NEXT_PUBLIC_SITE_URL=https://montrealspider.ca` in production (not localhost).
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
