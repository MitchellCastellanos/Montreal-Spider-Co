/** Pure helpers for the open-catalog species lookup (no network, safe to unit test). */

export interface LookupPhoto {
  id: string;
  /** Small preview (square thumbnail). */
  thumbUrl: string;
  /** Large image — this is what gets copied to MSC storage when picked. */
  url: string;
  license: "cc0" | "cc-by";
  /** Name to credit (empty for CC0). */
  creditName: string;
  /** Full attribution string as provided by the catalog. */
  attribution: string;
  sourceUrl: string;
}

/** Licenses MSC may use commercially. NC / ND / SA / all-rights-reserved are excluded on purpose. */
export const COMMERCIAL_LICENSES = ["cc0", "cc-by"] as const;

export function isCommercialLicense(code: string | null | undefined): code is "cc0" | "cc-by" {
  return code === "cc0" || code === "cc-by";
}

/** Hosts we are willing to download photos from (SSRF guard for the import action). */
export const PHOTO_HOSTS = ["inaturalist-open-data.s3.amazonaws.com", "static.inaturalist.org"] as const;

export function isAllowedPhotoUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      (PHOTO_HOSTS as readonly string[]).includes(u.hostname) &&
      /^\/photos\/\d+\/(large|medium|original)\.[a-z0-9]+$/i.test(u.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Reduce a listing name ("Aphonopelma seemanni (Nicaragua)", `Neoholothele incei "GOLD color form"`,
 * "Grammostola quirogai  (hobby G pulchra)") to "Genus species". Returns just the genus when no
 * species epithet is present, and "" when nothing usable is left.
 */
export function normalizeScientific(input: string): string {
  const cleaned = input
    .replace(/["“”][^"“”]*["“”]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^A-Za-z\s.-]/g, " ")
    .trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const genus = tokens[0];
  if (!genus || !/^[A-Za-z-]{2,}$/.test(genus)) return "";
  const G = genus[0].toUpperCase() + genus.slice(1).toLowerCase();
  const epithet = tokens[1]?.replace(/\.$/, "").toLowerCase();
  if (!epithet || ["sp", "spp", "cf", "aff", "x"].includes(epithet) || !/^[a-z-]{2,}$/.test(epithet)) return G;
  return `${G} ${epithet}`;
}

interface INatPhotoLike {
  id?: number;
  license_code?: string | null;
  attribution?: string | null;
  attribution_name?: string | null;
  url?: string | null;
  square_url?: string | null;
  medium_url?: string | null;
  large_url?: string | null;
}

function upgradeSize(url: string, size: "large" | "medium"): string {
  return url.replace(/\/(square|small|medium|large|original)\./, `/${size}.`);
}

/** Author to credit: `attribution_name`, else parsed from "(c) Name, some rights reserved (CC BY)". */
function authorOf(photo: INatPhotoLike): string {
  const named = (photo.attribution_name ?? "").trim();
  if (named) return named;
  return /^\(c\)\s*([^,]+?),/i.exec(photo.attribution ?? "")?.[1]?.trim() ?? "";
}

/** Convert an iNaturalist photo into an option, or null when it is not usable commercially. */
export function toPhotoOption(photo: INatPhotoLike | null | undefined): LookupPhoto | null {
  if (!photo?.id || !isCommercialLicense(photo.license_code)) return null;
  const base = photo.large_url ?? photo.medium_url ?? photo.url ?? photo.square_url;
  if (!base) return null;
  const url = upgradeSize(base, "large");
  if (!isAllowedPhotoUrl(url)) return null;
  const license = photo.license_code;
  return {
    id: String(photo.id),
    thumbUrl: upgradeSize(photo.square_url ?? photo.url ?? base, "medium"),
    url,
    license,
    creditName: license === "cc0" ? "" : authorOf(photo),
    attribution: (photo.attribution ?? "").trim(),
    sourceUrl: `https://www.inaturalist.org/photos/${photo.id}`,
  };
}

/** De-duplicate by photo id, keep the first `n`. Input order = priority. */
export function pickPhotos(candidates: (LookupPhoto | null)[], n = 4): LookupPhoto[] {
  const seen = new Set<string>();
  const out: LookupPhoto[] = [];
  for (const c of candidates) {
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

/** The note stored on the library image; `formatCreditNote` (species-library) reads it back. */
export function buildCreditNote(p: Pick<LookupPhoto, "creditName" | "license" | "sourceUrl">): string {
  const licenseLabel = p.license === "cc0" ? "CC0" : "CC BY";
  return `Credit: ${p.creditName || "iNaturalist contributor"} · License: ${licenseLabel} · Source: ${p.sourceUrl}`;
}

/** "Credit: A · License: CC BY · Source: https://…" → "Photo: A · CC BY · iNaturalist". */
export function formatCreditNote(notes: string): string {
  const credit = /Credit:\s*([^·]+)/.exec(notes)?.[1]?.trim() ?? "";
  const license = /License:\s*([^·]+)/.exec(notes)?.[1]?.trim() ?? "";
  return [`Photo: ${credit}`, license, "iNaturalist"].filter(Boolean).join(" · ");
}
