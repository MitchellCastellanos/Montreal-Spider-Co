import "server-only";
import { prisma } from "@/lib/db";
import { getExternalSettings } from "@/lib/external-orders/settings";
import { breakdownAt, computeOfferPrice, DEFAULT_PRICING, passesProfitGate, type PricingParams } from "@/lib/external-orders/pricing";
import { planRotation, type RotationOffer, type RotationPlan } from "@/lib/external-orders/rotation";
import type { ExternalSettings } from "@/lib/external-orders/pure";

const LAST_RUN_KEY = "external_last_rotation";

export function pricingFrom(s: ExternalSettings): PricingParams {
  return {
    ...DEFAULT_PRICING,
    marginPct: s.marginPct,
    minProfit: s.minProfit,
    handlingCost: s.handlingCost,
    lossReservePct: s.lossReservePct,
  };
}

export interface RotationRow {
  id: string;
  visits: number;
  eligible: boolean;
  operatingProfit: number;
  operatingMarginPct: number;
  /** "publish" | "hide" | "keep" — what the plan does with it. */
  action: "publish" | "hide" | "keep";
  reason: string;
}

export interface RotationOverview {
  plan: RotationPlan;
  rows: Record<string, RotationRow>;
  windowDays: number;
}

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

/** Page views per product over the lookback window (first-party PageView, bots already excluded). */
async function visitsByProduct(windowDays: number, slugToProduct: Map<string, string>, now: Date): Promise<Record<string, number>> {
  const db = requireDb();
  const since = new Date(now.getTime() - windowDays * 86_400_000);
  const grouped = await db.pageView.groupBy({
    by: ["path"],
    where: { path: { startsWith: "/product/" }, createdAt: { gte: since } },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const g of grouped) {
    const productId = slugToProduct.get(g.path.slice("/product/".length).split("/")[0]);
    if (productId) out[productId] = (out[productId] ?? 0) + g._count._all;
  }
  return out;
}

/** Compute what the rotation would do right now (read-only). */
export async function buildRotation(now = new Date()): Promise<RotationOverview> {
  const db = requireDb();
  const settings = await getExternalSettings();
  const pricing = pricingFrom(settings);
  const offers = await db.supplierOffer.findMany({ include: { product: { select: { slug: true } } } });
  const slugToProduct = new Map(offers.map((o) => [o.product.slug, o.productId]));
  const visits = await visitsByProduct(settings.rotationWindowDays, slugToProduct, now);

  const rows: Record<string, RotationRow> = {};
  const input: RotationOffer[] = offers.map((o) => {
    // A margin-priced offer that isn't visible yet will be (re)priced when it goes live, so it only needs a reachable target.
    const price = o.priceMode === "margin" && !o.published ? (computeOfferPrice(o.unitCost, pricing)?.price ?? 0) : o.price;
    const eligible = o.unitCost > 0 && price > 0 && passesProfitGate(price, o.unitCost, pricing);
    const b = breakdownAt(price, o.unitCost, pricing);
    rows[o.id] = {
      id: o.id,
      visits: visits[o.productId] ?? 0,
      eligible,
      operatingProfit: b.operatingProfit,
      operatingMarginPct: b.operatingMarginPct,
      action: "keep",
      reason: "",
    };
    return { id: o.id, productId: o.productId, published: o.published, publishedAt: o.publishedAt, rotates: o.rotates, pinned: o.pinned, eligible };
  });

  const plan = planRotation({
    offers: input,
    visitsByProduct: visits,
    slots: settings.rotationSlots,
    minDays: settings.rotationMinDays,
    now,
  });
  for (const id of plan.publish) rows[id].action = "publish";
  for (const id of plan.unpublish) rows[id].action = "hide";
  for (const [id, reason] of Object.entries(plan.reasons)) if (rows[id]) rows[id].reason = reason;
  for (const o of offers) {
    if (!rows[o.id].eligible && !rows[o.id].reason) rows[o.id].reason = o.unitCost > 0 ? "Below the profit target" : "No supplier cost set";
  }
  return { plan, rows, windowDays: settings.rotationWindowDays };
}

/** Apply a plan: hide/show offers; margin-priced offers are repriced as they go live. */
export async function applyRotation(plan: RotationPlan, now = new Date()): Promise<{ published: number; hidden: number }> {
  const db = requireDb();
  const settings = await getExternalSettings();
  const pricing = pricingFrom(settings);

  if (plan.unpublish.length) {
    await db.supplierOffer.updateMany({ where: { id: { in: plan.unpublish } }, data: { published: false } });
  }
  for (const id of plan.publish) {
    const o = await db.supplierOffer.findUnique({ where: { id } });
    if (!o) continue;
    const priced = o.priceMode === "margin" ? computeOfferPrice(o.unitCost, pricing) : null;
    await db.supplierOffer.update({
      where: { id },
      data: { published: true, publishedAt: now, ...(priced ? { price: priced.price } : {}) },
    });
  }
  return { published: plan.publish.length, hidden: plan.unpublish.length };
}

/** Recalculate a margin-priced offer from today's cost and profit rules. Returns the new price. */
export async function repriceOffer(id: string): Promise<number> {
  const db = requireDb();
  const o = await db.supplierOffer.findUnique({ where: { id } });
  if (!o) throw new Error("Offer not found.");
  if (!(o.unitCost > 0)) throw new Error("Set the supplier cost first.");
  const priced = computeOfferPrice(o.unitCost, pricingFrom(await getExternalSettings()));
  if (!priced) throw new Error("The profit margin target can't be reached — lower it in Settings.");
  await db.supplierOffer.update({ where: { id }, data: { price: priced.price } });
  return priced.price;
}

export interface LastRotation {
  at: string;
  mode: string;
  published: number;
  hidden: number;
}

async function saveLastRun(info: LastRotation): Promise<void> {
  const value = JSON.stringify(info);
  await requireDb().siteSetting.upsert({ where: { key: LAST_RUN_KEY }, create: { key: LAST_RUN_KEY, value }, update: { value } });
}

export async function getLastRotation(): Promise<LastRotation | null> {
  if (!prisma) return null;
  const row = await prisma.siteSetting.findUnique({ where: { key: LAST_RUN_KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as LastRotation;
  } catch {
    return null;
  }
}

/** Cron entry: in "auto" mode apply the plan; otherwise do nothing (suggest/off). */
export async function runRotation(now = new Date()): Promise<{ mode: string; published: number; hidden: number }> {
  const settings = await getExternalSettings();
  if (!settings.enabled || settings.rotationMode !== "auto") return { mode: settings.rotationMode, published: 0, hidden: 0 };
  const { plan } = await buildRotation(now);
  const r = await applyRotation(plan, now);
  await saveLastRun({ at: now.toISOString(), mode: "auto", ...r });
  return { mode: "auto", ...r };
}

/** Staff pressed "Apply" in suggest mode. */
export async function applyRotationNow(now = new Date()): Promise<{ published: number; hidden: number }> {
  const { plan } = await buildRotation(now);
  const r = await applyRotation(plan, now);
  await saveLastRun({ at: now.toISOString(), mode: "manual", ...r });
  return r;
}
