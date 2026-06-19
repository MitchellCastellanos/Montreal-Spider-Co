// Runs at build time (see the "build" script). When a database is configured,
// it syncs the Prisma schema and seeds base data (only for empty tables).
// When there's no DATABASE_URL (e.g. local builds, CI without a DB) it skips,
// so the build never fails for lack of a database.
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[db-deploy] No DATABASE_URL set — skipping schema sync & seed.");
  process.exit(0);
}

if (!process.env.DIRECT_URL) {
  console.warn("[db-deploy] DIRECT_URL is not set. Prisma needs the direct (non-pooled) connection for schema changes — add it to your env.");
}

function run(label, cmd, { fatal }) {
  console.log(`[db-deploy] ${label}…`);
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    if (fatal) {
      console.error(`[db-deploy] ${label} failed: ${msg}`);
      process.exit(1);
    }
    console.warn(`[db-deploy] ${label} failed (continuing): ${msg}`);
    return false;
  }
}

// 1) Migrate legacy PickupPoint / AuthorizedDistributor tables when present.
run("Migrating legacy location tables", "node scripts/migrate-legacy-locations.mjs", { fatal: true });

// 2) Sync the schema to the database (additive changes apply automatically;
//    destructive changes fail the build so they get reviewed).
run("Syncing schema (prisma db push)", "prisma db push --skip-generate", { fatal: true });

// 3) Seed base data — the seed only fills EMPTY tables, so this is safe to run
//    on every deploy and won't resurrect rows you deleted in the admin.
run("Seeding base data (empty tables only)", "prisma db seed", { fatal: false });
