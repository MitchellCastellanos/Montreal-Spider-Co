import "server-only";
import { prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { notifyStaff } from "@/lib/notifications/service";
import { getExternalSettings } from "@/lib/external-orders/settings";
import {
  assessCatalog,
  MAX_CATALOG_BYTES,
  parseCatalog,
  TARCAN_CATALOG_URL,
} from "@/lib/suppliers/tarcan";

const SUPPLIER = "tarcan";
/** The cron never hits the supplier more often than this, whatever calls it. */
const CRON_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MANUAL_MIN_INTERVAL_MS = 5 * 60 * 1000;
const LOCK_MS = 10 * 60 * 1000;

export interface SyncSummary {
  status: "ok" | "suspect" | "failed" | "skipped";
  detail: string;
  itemCount?: number;
  newCount?: number;
  priceChanges?: number;
  missingCount?: number;
}

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

async function readCapped(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_CATALOG_BYTES) throw new Error("Response too large.");
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_CATALOG_BYTES) throw new Error("Response too large.");
  return new TextDecoder().decode(buf);
}

async function alert(status: string, detail: string): Promise<void> {
  try {
    await notifyStaff({
      templateId: "internal-supplier-sync-alert",
      event: "supplier.sync_problem",
      data: { supplier: "Tarantula Canada", status, detail, adminUrl: `${SITE.url.replace(/\/$/, "")}/en/admin/external` },
    });
  } catch (e) {
    console.error("[supplier-sync] alert failed:", e);
  }
}

/**
 * Read the supplier's public catalog ONCE and update what we know about it: new items, price changes,
 * and which items are no longer listed. Idempotent; a suspicious or failed response never marks anything
 * missing (so a broken feed can't hide the catalog), and stale data expires on its own (see `isListed`).
 */
export async function runSupplierSync(
  trigger: "cron" | "manual",
  now = new Date(),
): Promise<SyncSummary> {
  const db = requireDb();
  const settings = await getExternalSettings();
  if (trigger === "cron" && !settings.syncEnabled) return { status: "skipped", detail: "Supplier sync is switched off." };

  // Concurrency + politeness guard: one run at a time, and never more often than the minimum interval.
  const last = await db.supplierSyncRun.findFirst({ where: { supplier: SUPPLIER }, orderBy: { startedAt: "desc" } });
  if (last) {
    const age = now.getTime() - last.startedAt.getTime();
    if (last.status === "running" && age < LOCK_MS) return { status: "skipped", detail: "Another sync is running." };
    const minAge = trigger === "cron" ? CRON_MIN_INTERVAL_MS : MANUAL_MIN_INTERVAL_MS;
    if (last.status !== "running" && age < minAge) return { status: "skipped", detail: "Synced recently — waiting before asking the supplier again." };
  }
  const run = await db.supplierSyncRun.create({ data: { supplier: SUPPLIER, startedAt: now, trigger } });
  const finish = async (s: SyncSummary, error = "") => {
    await db.supplierSyncRun.update({
      where: { id: run.id },
      data: {
        status: s.status,
        finishedAt: new Date(),
        itemCount: s.itemCount ?? 0,
        newCount: s.newCount ?? 0,
        priceChanges: s.priceChanges ?? 0,
        missingCount: s.missingCount ?? 0,
        error: error.slice(0, 500),
      },
    });
    return s;
  };

  let payload: unknown;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetch(TARCAN_CATALOG_URL, {
      headers: { "User-Agent": `MontrealSpiderCo-catalog-check/1.0 (+${SITE.url})`, Accept: "application/json" },
      signal: ctl.signal,
      redirect: "error",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    payload = JSON.parse(await readCapped(res));
  } catch (e) {
    const detail = `Fetch failed: ${e instanceof Error ? e.message : "unknown error"}`;
    await alert("failed", detail);
    return finish({ status: "failed", detail }, detail);
  } finally {
    clearTimeout(timer);
  }

  let parsed;
  try {
    parsed = parseCatalog(payload);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Invalid catalog";
    await alert("suspect", detail);
    return finish({ status: "suspect", detail }, detail);
  }
  const previous = await db.supplierItem.count({ where: { supplier: SUPPLIER, missingRuns: 0 } });
  const verdict = assessCatalog(parsed, previous);
  if (!verdict.ok) {
    await alert("suspect", verdict.reason);
    return finish({ status: "suspect", detail: verdict.reason, itemCount: parsed.items.length }, verdict.reason);
  }

  const existing = new Map(
    (await db.supplierItem.findMany({ where: { supplier: SUPPLIER } })).map((i) => [i.externalId, i]),
  );
  let newCount = 0;
  let priceChanges = 0;
  const ops = [];
  const costUpdates: { externalId: number; price: number }[] = [];
  for (const it of parsed.items) {
    const data = {
      rawName: it.rawName,
      genus: it.genus,
      species: it.species,
      sizeRaw: it.sizeRaw,
      sizeCm: it.sizeCm,
      sex: it.sex,
      price: it.price,
      listPrice: it.listPrice,
      salePrice: it.salePrice,
      notes: it.notes,
      isNewArrival: it.isNewArrival,
      lastSeenAt: now,
      missingRuns: 0,
    };
    const prev = existing.get(it.externalId);
    if (!prev) {
      newCount++;
      ops.push(db.supplierItem.create({ data: { supplier: SUPPLIER, externalId: it.externalId, ...data, firstSeenAt: now } }));
    } else {
      const changed = Math.abs(prev.price - it.price) > 0.001;
      if (changed) {
        priceChanges++;
        costUpdates.push({ externalId: it.externalId, price: it.price });
      }
      ops.push(
        db.supplierItem.update({
          where: { id: prev.id },
          data: { ...data, ...(changed ? { prevPrice: prev.price, priceChangedAt: now } : {}) },
        }),
      );
    }
  }
  const seenIds = parsed.items.map((i) => i.externalId);
  ops.push(
    db.supplierItem.updateMany({
      where: { supplier: SUPPLIER, externalId: { notIn: seenIds } },
      data: { missingRuns: { increment: 1 } },
    }),
  );
  await db.$transaction(ops);

  // Keep linked offers' private cost in step with the supplier's price (the profit gate then re-checks them).
  for (const c of costUpdates) {
    await db.supplierOffer.updateMany({
      where: { item: { supplier: SUPPLIER, externalId: c.externalId } },
      data: { unitCost: c.price },
    });
  }

  const missingCount = await db.supplierItem.count({ where: { supplier: SUPPLIER, missingRuns: { gt: 0 } } });
  return finish({
    status: "ok",
    detail: `${parsed.items.length} animals listed.`,
    itemCount: parsed.items.length,
    newCount,
    priceChanges,
    missingCount,
  });
}

export async function getLastSyncRun() {
  if (!prisma) return null;
  return prisma.supplierSyncRun.findFirst({ where: { supplier: SUPPLIER }, orderBy: { startedAt: "desc" } });
}
