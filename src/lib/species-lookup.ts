import "server-only";
import {
  normalizeScientific,
  pickPhotos,
  toPhotoOption,
  type LookupPhoto,
} from "@/lib/species-lookup-utils";

const UA = "MontrealSpiderCo-admin/1.0 (species photo lookup; contact via site)";
const INAT = "https://api.inaturalist.org/v1";
const GBIF = "https://api.gbif.org/v1";

export interface SpeciesLookupResult {
  query: string;
  normalized: string;
  /** True when the catalog returned exactly the name searched (otherwise it is the closest match — review it). */
  exact: boolean;
  names: { scientific: string; commonEn: string; commonFr: string; genus: string };
  taxonomy: {
    status: string;
    matchType: string;
    family: string;
    acceptedName: string;
    isSynonym: boolean;
  } | null;
  photos: LookupPhoto[];
  warnings: string[];
}

async function getJson<T>(url: string): Promise<T | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface INatTaxon {
  id: number;
  name: string;
  preferred_common_name?: string;
  english_common_name?: string;
  taxon_photos?: { photo?: Record<string, unknown> }[];
}

interface GbifMatch {
  status?: string;
  matchType?: string;
  family?: string;
  canonicalName?: string;
  synonym?: boolean;
  acceptedUsageKey?: number;
}

/** Look up a species in free, open catalogs (iNaturalist + GBIF). Never throws; failures become warnings. */
export async function lookupSpecies(raw: string): Promise<SpeciesLookupResult> {
  const query = raw.trim().slice(0, 120);
  const normalized = normalizeScientific(query);
  const result: SpeciesLookupResult = {
    query,
    normalized,
    exact: false,
    names: { scientific: normalized, commonEn: "", commonFr: "", genus: normalized.split(" ")[0] ?? "" },
    taxonomy: null,
    photos: [],
    warnings: [],
  };
  if (!normalized) {
    result.warnings.push("Enter a scientific name first (Genus species).");
    return result;
  }
  if (!normalized.includes(" ")) result.warnings.push("Only the genus is known — the lookup needs “Genus species”.");

  const q = encodeURIComponent(normalized);
  const [search, gbif] = await Promise.all([
    getJson<{ results?: INatTaxon[] }>(`${INAT}/taxa?q=${q}&rank=species&per_page=5&locale=fr`),
    getJson<GbifMatch>(`${GBIF}/species/match?name=${q}&kingdom=Animalia`),
  ]);

  if (gbif && gbif.matchType && gbif.matchType !== "NONE") {
    let acceptedName = "";
    if (gbif.synonym && gbif.acceptedUsageKey) {
      const accepted = await getJson<{ canonicalName?: string }>(`${GBIF}/species/${gbif.acceptedUsageKey}`);
      acceptedName = accepted?.canonicalName ?? "";
    }
    result.taxonomy = {
      status: gbif.status ?? "",
      matchType: gbif.matchType,
      family: gbif.family ?? "",
      acceptedName,
      isSynonym: Boolean(gbif.synonym),
    };
    if (gbif.synonym) {
      result.warnings.push(
        `GBIF lists “${gbif.canonicalName ?? normalized}” as a synonym${acceptedName ? ` of “${acceptedName}”` : ""}. Check the right name before publishing — nothing is merged automatically.`,
      );
    }
    if (gbif.matchType !== "EXACT") result.warnings.push(`GBIF match is “${gbif.matchType}”, not exact — verify the taxonomy.`);
  } else {
    result.warnings.push("GBIF did not recognise this name — check the spelling.");
  }

  const hits = search?.results ?? [];
  const taxon = hits.find((t) => t.name.toLowerCase() === normalized.toLowerCase()) ?? hits[0];
  if (!taxon) {
    result.warnings.push("No match in iNaturalist — no photos or common names found.");
    return result;
  }
  result.exact = taxon.name.toLowerCase() === normalized.toLowerCase();
  if (!result.exact) result.warnings.push(`iNaturalist returned “${taxon.name}”, not “${normalized}”. Review before applying anything.`);
  result.names = {
    scientific: result.exact ? taxon.name : normalized,
    commonEn: taxon.english_common_name ?? "",
    commonFr: taxon.preferred_common_name ?? "",
    genus: (result.exact ? taxon.name : normalized).split(" ")[0] ?? "",
  };

  // Photos only for the exact species — a "closest match" could show the wrong animal.
  if (result.exact) {
    const [detail, obs] = await Promise.all([
      getJson<{ results?: INatTaxon[] }>(`${INAT}/taxa/${taxon.id}`),
      getJson<{ results?: { photos?: Record<string, unknown>[] }[] }>(
        `${INAT}/observations?taxon_id=${taxon.id}&photo_license=cc0,cc-by&quality_grade=research&photos=true&order_by=votes&per_page=20`,
      ),
    ]);
    const curated = (detail?.results?.[0]?.taxon_photos ?? []).map((tp) => toPhotoOption(tp.photo));
    const community = (obs?.results ?? []).map((o) => toPhotoOption(o.photos?.[0]));
    result.photos = pickPhotos([...curated, ...community], 4);
    if (result.photos.length === 0) result.warnings.push("No commercially-usable (CC0 / CC BY) photos found — upload one manually.");
  }
  return result;
}
