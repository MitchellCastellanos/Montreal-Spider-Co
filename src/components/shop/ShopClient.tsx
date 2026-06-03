"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import { useI18n, useT } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import { basePrice, totalStock, type Experience, type Product, type SpiderType, type Temperament } from "@/lib/types";

type Sort = "featured" | "price-asc" | "price-desc" | "name" | "newest";

const EXPERIENCES: Experience[] = ["beginner", "intermediate", "advanced"];
const TYPES: SpiderType[] = ["terrestrial", "arboreal", "fossorial"];
const TEMPERS: Temperament[] = ["docile", "skittish", "defensive"];

export default function ShopClient({ products, genera }: { products: Product[]; genera: string[] }) {
  const { dict, locale } = useI18n();
  const tr = useT();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const initArray = (key: string) => (sp.get(key) ? sp.get(key)!.split(",").filter(Boolean) : []);
  const priceCeiling = Math.ceil(Math.max(...products.map((p) => basePrice(p))) / 10) * 10;

  const [experience, setExperience] = useState<string[]>(initArray("experience"));
  const [type, setType] = useState<string[]>(initArray("type"));
  const [temperament, setTemperament] = useState<string[]>(initArray("temperament"));
  const [genus, setGenus] = useState<string[]>(initArray("genus"));
  const [maxPrice, setMaxPrice] = useState<number>(Number(sp.get("maxPrice")) || priceCeiling);
  const [inStock, setInStock] = useState<boolean>(sp.get("inStock") === "1");
  const [sort, setSort] = useState<Sort>((sp.get("sort") as Sort) || "featured");
  const [query, setQuery] = useState<string>(sp.get("q") || "");
  const [mobileOpen, setMobileOpen] = useState(false);

  // keep URL in sync (shareable filtered links)
  useEffect(() => {
    const params = new URLSearchParams();
    if (experience.length) params.set("experience", experience.join(","));
    if (type.length) params.set("type", type.join(","));
    if (temperament.length) params.set("temperament", temperament.join(","));
    if (genus.length) params.set("genus", genus.join(","));
    if (maxPrice < priceCeiling) params.set("maxPrice", String(maxPrice));
    if (inStock) params.set("inStock", "1");
    if (sort !== "featured") params.set("sort", sort);
    if (query) params.set("q", query);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [experience, type, temperament, genus, maxPrice, inStock, sort, query, pathname, router, priceCeiling]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (experience.length && !experience.includes(p.experience)) return false;
      if (type.length && !type.includes(p.type)) return false;
      if (temperament.length && !temperament.includes(p.temperament)) return false;
      if (genus.length && !genus.includes(p.genus)) return false;
      if (basePrice(p) > maxPrice) return false;
      if (inStock && totalStock(p) === 0) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${p.scientific} ${p.common.en} ${p.common.fr} ${p.genus}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return basePrice(a) - basePrice(b);
        case "price-desc":
          return basePrice(b) - basePrice(a);
        case "name":
          return tr(a.common).localeCompare(tr(b.common));
        case "newest":
          return b.arrived.localeCompare(a.arrived);
        default:
          return Number(!!b.featured) - Number(!!a.featured) || b.rating - a.rating;
      }
    });
    return result;
  }, [products, experience, type, temperament, genus, maxPrice, inStock, query, sort, tr]);

  const activeCount =
    experience.length + type.length + temperament.length + genus.length + (inStock ? 1 : 0) + (maxPrice < priceCeiling ? 1 : 0);

  const clearAll = () => {
    setExperience([]);
    setType([]);
    setTemperament([]);
    setGenus([]);
    setMaxPrice(priceCeiling);
    setInStock(false);
    setQuery("");
  };

  const s = dict.shop;

  const FilterPanel = (
    <div className="space-y-7">
      <FilterGroup title={s.experience}>
        {EXPERIENCES.map((e) => (
          <CheckRow key={e} label={dict.filters[e]} checked={experience.includes(e)} onChange={() => toggle(experience, setExperience, e)} />
        ))}
      </FilterGroup>
      <FilterGroup title={s.type}>
        {TYPES.map((tp) => (
          <CheckRow key={tp} label={dict.filters[tp]} checked={type.includes(tp)} onChange={() => toggle(type, setType, tp)} />
        ))}
      </FilterGroup>
      <FilterGroup title={s.temperament}>
        {TEMPERS.map((tm) => (
          <CheckRow key={tm} label={dict.filters[tm]} checked={temperament.includes(tm)} onChange={() => toggle(temperament, setTemperament, tm)} />
        ))}
      </FilterGroup>
      <FilterGroup title={s.genus}>
        <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
          {genera.map((g) => (
            <CheckRow key={g} label={g} checked={genus.includes(g)} onChange={() => toggle(genus, setGenus, g)} italic />
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title={s.price}>
        <input
          type="range"
          min={20}
          max={priceCeiling}
          step={5}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[var(--gold)]"
          aria-label={s.price}
        />
        <div className="mt-1 flex justify-between text-xs text-bone">
          <span>{formatPrice(20, locale)}</span>
          <span className="text-gold-bright">≤ {formatPrice(maxPrice, locale)}</span>
        </div>
      </FilterGroup>
      <FilterGroup title={s.availability}>
        <CheckRow label={s.onlyInStock} checked={inStock} onChange={() => setInStock((v) => !v)} />
      </FilterGroup>
    </div>
  );

  return (
    <div className="container-x py-10 md:py-14">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-cream md:text-5xl">{s.title}</h1>
        <p className="mt-2 max-w-2xl text-bone">{s.subtitle}</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.nav.search}
            className="input pl-9"
            aria-label={dict.nav.search}
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input w-auto" aria-label={s.sortLabel}>
          <option value="featured">{s.sortFeatured}</option>
          <option value="newest">{s.sortNewest}</option>
          <option value="price-asc">{s.sortPriceAsc}</option>
          <option value="price-desc">{s.sortPriceDesc}</option>
          <option value="name">{s.sortNameAsc}</option>
        </select>
        <button onClick={() => setMobileOpen(true)} className="btn btn-ghost lg:hidden">
          {s.filters} {activeCount > 0 && <span className="badge ml-1">{activeCount}</span>}
        </button>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border border-line bg-ink-soft/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-cream">{s.filters}</h2>
              {activeCount > 0 && (
                <button onClick={clearAll} className="text-xs text-gold-deep hover:text-gold-bright">
                  {s.clearFilters}
                </button>
              )}
            </div>
            {FilterPanel}
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <p className="mb-4 text-sm text-muted">
            {filtered.length} {filtered.length === 1 ? s.resultsOne.replace("{count} ", "") : s.resultsMany.replace("{count} ", "")}
          </p>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-line bg-ink-soft/40 p-12 text-center">
              <p className="text-lg text-cream">{s.noResults}</p>
              <p className="mt-2 text-sm text-bone">{s.noResultsHint}</p>
              <button onClick={clearAll} className="btn btn-ghost mt-5">
                {s.clearFilters}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-[70] bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[71] max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-line bg-ink-soft p-6 lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl text-cream">{s.filters}</h2>
                <button onClick={() => setMobileOpen(false)} className="text-2xl text-bone">×</button>
              </div>
              {FilterPanel}
              <div className="mt-6 flex gap-3">
                <button onClick={clearAll} className="btn btn-ghost flex-1">{s.clearFilters}</button>
                <button onClick={() => setMobileOpen(false)} className="btn btn-gold flex-1">{s.applyFilters}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gold-deep">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CheckRow({ label, checked, onChange, italic }: { label: string; checked: boolean; onChange: () => void; italic?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-bone hover:text-cream">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border transition ${
          checked ? "border-gold bg-gold text-ink" : "border-line"
        }`}
        aria-hidden
      >
        {checked && "✓"}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span className={italic ? "italic" : ""}>{label}</span>
    </label>
  );
}
