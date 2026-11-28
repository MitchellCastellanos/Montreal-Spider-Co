/**
 * Parsing + validation of Tarantula Canada's public catalog (`items/read.php`). Pure — no I/O.
 *
 * Facts this relies on (verified against the live JSON during the audit):
 *  - there is NO quantity field: presence in the catalog is the only availability signal;
 *  - the supplier nests variants under parents NON-deterministically (the same `itemid` can be a parent
 *    in one response and a child in the next, and `unique`/`subitems` change) → flatten and de-duplicate by `itemid`;
 *  - `sex`: 0 unsexed, 1 male, 2 female (2 is inferred from pricing/photos); size is a string in inches.
 */
import { normalizeScientific } from "@/lib/species-lookup-utils";

export const TARCAN_CATALOG_URL = "https://api.tarantulacanada.ca/items/read.php?language=en";
export const MAX_CATALOG_BYTES = 3 * 1024 * 1024;
/** Fewer animals than this in one response is treated as a broken payload, not a catalog. */
export const MIN_PLAUSIBLE_ANIMALS = 30;

export type Sex = "unsexed" | "male" | "female";

export interface ParsedItem {
  externalId: number;
  rawName: string;
  genus: string;
  species: string;
  sizeRaw: string;
  sizeCm: number | null;
  sex: Sex;
  /** What MSC would pay: the sale price when there is one. */
  price: number;
  listPrice: number;
  salePrice: number | null;
  notes: string;
  isNewArrival: boolean;
}

export interface ParseResult {
  items: ParsedItem[];
  /** Animals skipped because a required field was invalid. */
  rejected: number;
  /** Flattened rows seen (all categories) — for diagnostics. */
  rowsSeen: number;
}

const SEX: Record<number, Sex> = { 0: "unsexed", 1: "male", 2: "female" };

/** `1/2"`, `2.5"`, `3"`, `1 1/2"` → cm. Anything else (e.g. the supplier's `3"3`) → null. */
export function parseSizeInchesToCm(raw: string): number | null {
  const t = raw.replace(/["”″]/g, "").trim();
  let inches: number | null = null;
  let m: RegExpExecArray | null;
  if ((m = /^(\d+(?:\.\d+)?)$/.exec(t))) inches = Number(m[1]);
  else if ((m = /^(\d+)\/(\d+)$/.exec(t))) inches = Number(m[2]) > 0 ? Number(m[1]) / Number(m[2]) : null;
  else if ((m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(t))) inches = Number(m[3]) > 0 ? Number(m[1]) + Number(m[2]) / Number(m[3]) : null;
  if (inches == null || !(inches > 0) || inches > 12) return null;
  return Math.round(inches * 2.54 * 100) / 100;
}

/** Plain text only: strip tags/control chars and cap the length — supplier text is untrusted. */
export function cleanText(v: unknown, max = 200): string {
  if (typeof v !== "string") return "";
  return v.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

interface RawRow {
  [k: string]: unknown;
  subitems?: unknown;
}

function flatten(rows: unknown[], into: Map<number, RawRow>): void {
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const row = r as RawRow;
    const id = Number(row.itemid);
    if (Number.isInteger(id) && id > 0 && !into.has(id)) into.set(id, row);
    if (Array.isArray(row.subitems)) flatten(row.subitems, into);
  }
}

/** Throws when the payload is not a catalog at all; otherwise returns the animals it contains. */
export function parseCatalog(payload: unknown): ParseResult {
  if (!Array.isArray(payload)) throw new Error("Catalog payload is not a list.");
  const flat = new Map<number, RawRow>();
  flatten(payload, flat);

  const items: ParsedItem[] = [];
  let rejected = 0;
  for (const [externalId, row] of flat) {
    if (row.i_table !== "i_animal" || Number(row.active) !== 1) continue;
    const listPrice = Number(row.price);
    const sale = Number(row.saleprice);
    const salePrice = Number.isFinite(sale) && sale > 0 ? sale : null;
    const price = salePrice ?? listPrice;
    const name = cleanText(row.name);
    const sex = SEX[Number(row.sex)];
    if (!name || !sex || !Number.isFinite(listPrice) || listPrice <= 0 || price > 5000) {
      rejected++;
      continue;
    }
    const sizeRaw = cleanText(row.size, 20);
    const notes = cleanText(row.notes, 200);
    items.push({
      externalId,
      rawName: name,
      genus: cleanText(row.genus, 60),
      species: cleanText(row.species, 80),
      sizeRaw,
      sizeCm: parseSizeInchesToCm(sizeRaw),
      sex,
      price,
      listPrice,
      salePrice,
      notes,
      isNewArrival: /new arrival/i.test(cleanText(row.sting, 40)) || /new arrival/i.test(notes),
    });
  }
  return { items, rejected, rowsSeen: flat.size };
}

/**
 * Decide whether a response is trustworthy enough to act on. A suspicious response must never cause
 * offers to be marked missing (a broken feed would otherwise hide the whole catalog).
 */
export function assessCatalog(
  parsed: ParseResult,
  previousAnimalCount: number,
): { ok: true } | { ok: false; reason: string } {
  const n = parsed.items.length;
  if (n < MIN_PLAUSIBLE_ANIMALS) return { ok: false, reason: `Only ${n} animals in the response (expected a full catalog).` };
  if (previousAnimalCount >= MIN_PLAUSIBLE_ANIMALS && n < previousAnimalCount * 0.6) {
    return { ok: false, reason: `Animal count dropped from ${previousAnimalCount} to ${n} (>40%).` };
  }
  if (parsed.rejected > n * 0.3) return { ok: false, reason: `${parsed.rejected} rows were invalid — the format may have changed.` };
  return { ok: true };
}

const LISTED_TTL_MS = 72 * 60 * 60 * 1000;

/**
 * Is the item currently available at the supplier? Present in a recent successful sync (≤72h, so a few
 * failed runs don't instantly hide everything but a long outage can't keep selling on old data), and not
 * missing from two consecutive successful syncs (one miss may be a glitch).
 */
export function isListed(item: { lastSeenAt: Date; missingRuns: number }, now: Date): boolean {
  return item.missingRuns < 2 && now.getTime() - item.lastSeenAt.getTime() <= LISTED_TTL_MS;
}

/** The "Genus species" key used to match a supplier item to a species listing — exact only, never fuzzy. */
export function speciesKey(rawName: string): string {
  return normalizeScientific(rawName).toLowerCase();
}
