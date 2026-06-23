"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { saveProductAction, type ActionState } from "@/app/[locale]/admin/actions";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/lib/href";
import type { Product } from "@/lib/types";
import type { LibraryImage } from "@/lib/data/species-library";
import type { SpeciesProfile } from "@/lib/data/species";
import ProductImageField from "@/components/admin/ProductImageField";
import SpeciesChatGptHelper from "@/components/admin/SpeciesChatGptHelper";
import type { DistributorView } from "@/lib/data/locations";
import ConceptInfo from "@/components/ConceptInfo";
import { deriveAccent,
  deriveGenus,
  deriveHue,
  deriveSlug,
  emptySpeciesFields,
  type SpeciesFormFields,
} from "@/lib/species-utils";
import { formatPrice } from "@/lib/format";
import { basePrice, totalStock } from "@/lib/types";

const EXPERIENCES = ["beginner", "intermediate", "advanced"];
const TYPES = ["terrestrial", "arboreal", "fossorial"];
const TEMPERS = ["docile", "skittish", "defensive"];

function productToForm(product: Product): SpeciesFormFields {
  return {
    slug: product.slug,
    scientific: product.scientific,
    commonEn: product.common.en,
    commonFr: product.common.fr,
    genus: product.genus,
    experience: product.experience,
    type: product.type,
    temperament: product.temperament,
    hue: product.hue,
    accent: product.accent,
    featured: product.featured ?? false,
    newArrival: product.newArrival ?? false,
    careGuide: product.careGuide ?? "",
    adultSizeEn: product.adultSize.en,
    adultSizeFr: product.adultSize.fr,
    growthEn: product.growth.en,
    growthFr: product.growth.fr,
    originEn: product.origin.en,
    originFr: product.origin.fr,
    lifespanEn: product.lifespan.en,
    lifespanFr: product.lifespan.fr,
    humidity: product.humidity,
    temperature: product.temperature,
    enclosureEn: product.enclosure.en,
    enclosureFr: product.enclosure.fr,
    dietEn: product.diet.en,
    dietFr: product.diet.fr,
    descriptionEn: product.description.en,
    descriptionFr: product.description.fr,
  };
}

function speciesToForm(species: SpeciesProfile): SpeciesFormFields {
  return {
    scientific: species.scientific,
    commonEn: species.commonEn,
    commonFr: species.commonFr,
    slug: deriveSlug(species.scientific, species.commonEn),
    genus: species.genus,
    experience: species.experience,
    type: species.type,
    temperament: species.temperament,
    hue: species.hue,
    accent: species.accent,
    featured: false,
    newArrival: true,
    careGuide: species.careGuide ?? "",
    adultSizeEn: species.adultSizeEn,
    adultSizeFr: species.adultSizeFr,
    growthEn: species.growthEn,
    growthFr: species.growthFr,
    originEn: species.originEn,
    originFr: species.originFr,
    lifespanEn: species.lifespanEn,
    lifespanFr: species.lifespanFr,
    humidity: species.humidity,
    temperature: species.temperature,
    enclosureEn: species.enclosureEn,
    enclosureFr: species.enclosureFr,
    dietEn: species.dietEn,
    dietFr: species.dietFr,
    descriptionEn: species.descriptionEn,
    descriptionFr: species.descriptionFr,
  };
}

interface DistributorStockRow {
  distributorId: string;
  stock: number;
}

export default function ProductForm({
  product,
  careGuides,
  defaultProductImage,
  libraryImages,
  speciesList,
  distributors,
}: {
  product: Product | null;
  careGuides: string[];
  defaultProductImage: string | null;
  libraryImages: LibraryImage[];
  speciesList: SpeciesProfile[];
  distributors: DistributorView[];
}) {
  const { locale } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProductAction, {});

  const initial = product ? productToForm(product) : emptySpeciesFields();
  const [form, setForm] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [selectedSpeciesId, setSelectedSpeciesId] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(!product);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [availableAtPickup, setAvailableAtPickup] = useState(product?.availableAtPickup ?? true);
  const [availableAtDistributor, setAvailableAtDistributor] = useState(product?.availableAtDistributor ?? false);
  const [hideWhenSoldOut, setHideWhenSoldOut] = useState(product?.hideWhenSoldOut ?? false);
  const [distributorStocks, setDistributorStocks] = useState<DistributorStockRow[]>(() =>
    distributors.map((d) => ({
      distributorId: d.id,
      stock: product?.distributorStocks?.find((s) => s.distributorId === d.id)?.stock ?? 0,
    }))
  );

  const patch = (fields: Partial<SpeciesFormFields>) => setForm((prev) => ({ ...prev, ...fields }));

  const onScientificChange = (scientific: string) => {
    const genus = deriveGenus(scientific);
    const hue = deriveHue(scientific);
    const accent = deriveAccent(scientific);
    const next: Partial<SpeciesFormFields> = { scientific, genus, hue, accent };
    if (!slugTouched) next.slug = deriveSlug(scientific, form.commonEn);
    patch(next);
    setSelectedSpeciesId("");
  };

  const onCommonEnChange = (commonEn: string) => {
    const next: Partial<{ slug: string }> = {};
    if (!slugTouched) next.slug = deriveSlug(form.scientific, commonEn);
    patch({ commonEn, ...next });
  };

  const filteredSpecies = useMemo(() => {
    const q = speciesSearch.trim().toLowerCase();
    if (!q) return speciesList;
    return speciesList.filter(
      (s) =>
        s.scientific.toLowerCase().includes(q) ||
        s.commonEn.toLowerCase().includes(q) ||
        s.commonFr.toLowerCase().includes(q) ||
        s.genus.toLowerCase().includes(q)
    );
  }, [speciesList, speciesSearch]);

  const isInCatalog = useMemo(() => {
    const sci = form.scientific.trim().toLowerCase();
    if (!sci) return false;
    return speciesList.some((s) => s.scientific.toLowerCase() === sci);
  }, [form.scientific, speciesList]);

  const applyChatGptFields = (fields: Partial<SpeciesFormFields>) => {
    const commonEn = fields.commonEn ?? form.commonEn;
    patch({
      ...fields,
      slug: slugTouched ? form.slug : deriveSlug(form.scientific || fields.scientific || "", commonEn),
    });
    setDetailsOpen(true);
    setSelectedSpeciesId("");
  };

  const loadSpecies = (species: SpeciesProfile) => {
    const mapped = speciesToForm(species);
    patch({
      ...mapped,
      slug: slugTouched ? form.slug : deriveSlug(species.scientific, species.commonEn),
    });
    setSelectedSpeciesId(species.id);
    setSpeciesSearch("");
    setDetailsOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-cream">{product ? "Edit product" : "New product"}</h1>
        <Link href={localeHref(locale, "/admin")} className="text-sm text-gold-deep hover:text-gold-bright">
          ← Back
        </Link>
      </div>

      <form action={action} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />
        {product && <input type="hidden" name="id" value={product.id} />}
        <input type="hidden" name="distributorStocks" value={JSON.stringify(distributorStocks.map((r) => ({ ...r, stock: 0 })))} />
        <input type="hidden" name="hue" value={form.hue} />
        <input type="hidden" name="accent" value={form.accent} />

        {/* Species library picker */}
        {speciesList.length > 0 && (
          <Section title="Load from species library">
            <p className="mb-3 text-sm text-bone">
              Pick a saved species profile to auto-fill description, specs, and care. Stock and pricing are set later in Inventory.
            </p>
            <input
              type="search"
              value={speciesSearch}
              onChange={(e) => setSpeciesSearch(e.target.value)}
              placeholder="Search by scientific name, common name, genus…"
              className="input mb-3"
            />
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line">
              {(speciesSearch ? filteredSpecies : speciesList).slice(0, 20).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadSpecies(s)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-gold/10 ${
                    selectedSpeciesId === s.id ? "bg-gold/15 text-cream" : "text-bone"
                  }`}
                >
                  <span>
                    <span className="font-medium text-cream">{s.scientific}</span>
                    <span className="ml-2 text-muted">— {s.commonEn}</span>
                  </span>
                  <span className="text-xs capitalize text-muted">{s.experience}</span>
                </button>
              ))}
              {filteredSpecies.length === 0 && (
                <p className="px-3 py-4 text-sm text-muted">No species match your search.</p>
              )}
            </div>
          </Section>
        )}

        {/* Identity — minimal */}
        <Section title="Listing">
          <Grid>
            <Field label="Scientific name *">
              <input
                name="scientific"
                value={form.scientific}
                onChange={(e) => onScientificChange(e.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label="Common name (EN) *">
              <input
                name="commonEn"
                value={form.commonEn}
                onChange={(e) => onCommonEnChange(e.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label="Common name (FR)">
              <input name="commonFr" value={form.commonFr} onChange={(e) => patch({ commonFr: e.target.value })} className="input" />
            </Field>
            <Field label="Genus">
              <input name="genus" value={form.genus} onChange={(e) => patch({ genus: e.target.value })} className="input" />
            </Field>
          </Grid>
          <div className="mt-3 flex flex-wrap gap-6">
            <Check name="featured" label="Featured" checked={form.featured} onChange={(v) => patch({ featured: v })} />
            <Check name="newArrival" label="New arrival" checked={form.newArrival} onChange={(v) => patch({ newArrival: v })} />
          </div>
        </Section>

        {/* ChatGPT prompt — new species not in catalog */}
        {!isInCatalog && (
          <Section title="New species? Use ChatGPT">
            <p className="mb-4 text-sm text-bone">
              This species isn&apos;t in your catalog yet. Copy the prompt below into ChatGPT, paste the reply back here,
              then save — the profile (and photo, or site default) is stored for future listings.
            </p>
            <SpeciesChatGptHelper
              scientific={form.scientific}
              careGuides={careGuides}
              onApply={applyChatGptFields}
            />
          </Section>
        )}

        {isInCatalog && !selectedSpeciesId && form.scientific.trim() && (
          <p className="rounded-xl border border-line bg-ink-soft/40 px-4 py-3 text-sm text-bone">
            <span className="text-cream">{form.scientific}</span> is already in your species catalog — use{" "}
            <strong className="text-gold-bright">Load from species library</strong> above to auto-fill, or edit fields below.
          </p>
        )}

        {/* Stock & pricing — read-only from inventory */}
        <Section title="Stock & pricing">
          <div className="rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-sm text-bone">
            <p className="font-medium text-cream">Prices are not set on this page.</p>
            <p className="mt-1">
              Set cost and store price when you receive specimens in{" "}
              <Link href={localeHref(locale, "/admin/inventory")} className="text-gold-bright hover:underline">
                Inventory → Receive batch
              </Link>
              . The storefront updates automatically — no second step here.
            </p>
          </div>
          {product && (
            <p className="mt-3 text-sm text-cream">
              Live on storefront: {totalStock(product)} available
              {totalStock(product) > 0 ? ` from ${formatPrice(basePrice(product), locale)}` : ""}.
            </p>
          )}
          <label className="mt-4 flex items-center gap-2 text-sm text-bone">
            <input
              type="checkbox"
              name="hideWhenSoldOut"
              checked={hideWhenSoldOut}
              onChange={(e) => setHideWhenSoldOut(e.target.checked)}
              className="accent-[var(--gold)]"
            />
            Hide this listing once it&apos;s sold out everywhere (instead of showing a &quot;Sold out&quot; badge)
          </label>
        </Section>

        <Section title="Availability channels">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-bone">
              <input
                type="checkbox"
                name="availableAtPickup"
                checked={availableAtPickup}
                onChange={(e) => setAvailableAtPickup(e.target.checked)}
                className="accent-[var(--gold)]"
              />
              Available at pickup points <ConceptInfo concept="pickup" className="ml-1" />
            </label>
            <label className="flex items-center gap-2 text-sm text-bone">
              <input
                type="checkbox"
                name="availableAtDistributor"
                checked={availableAtDistributor}
                onChange={(e) => setAvailableAtDistributor(e.target.checked)}
                className="accent-[var(--gold)]"
              />
              Available at authorized distributors <ConceptInfo concept="distributor" className="ml-1" />
            </label>
            {availableAtDistributor && distributors.length > 0 && (
              <div className="rounded-xl border border-line p-4">
                <p className="mb-3 text-sm font-medium text-cream">
                  Distributor stock — managed in{" "}
                  <Link href={localeHref(locale, "/admin/inventory")} className="text-gold-bright hover:underline">
                    Inventory
                  </Link>{" "}
                  (transfer specimens to consignment).
                </p>
                <ul className="space-y-1 text-sm text-bone">
                  {distributors.map((d) => {
                    const row = distributorStocks.find((r) => r.distributorId === d.id);
                    return (
                      <li key={d.id} className="flex justify-between">
                        <span>{d.name}</span>
                        <span className="text-cream">{row?.stock ?? 0}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {availableAtDistributor && distributors.length === 0 && (
              <p className="text-sm text-muted">
                No distributors yet — add them under{" "}
                <Link href={localeHref(locale, "/admin/pickup")} className="text-gold-bright hover:underline">
                  Locations
                </Link>
                .
              </p>
            )}
          </div>
        </Section>

        {/* Photo */}
        <Section title="Photo">
          <ProductImageField
            storedImage={product?.image ?? null}
            defaultProductImage={defaultProductImage}
            libraryImages={libraryImages}
            scientific={form.scientific}
            genus={form.genus}
          />
        </Section>

        {/* Species details — collapsible */}
        <section className="card-glow rounded-2xl p-5">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setDetailsOpen((o) => !o)}
          >
            <h2 className="font-display text-lg font-semibold text-cream">Description, specs &amp; care</h2>
            <span className="text-sm text-muted">{detailsOpen ? "Hide" : "Show"}</span>
          </button>
          {detailsOpen && (
            <div className="mt-4 space-y-4">
              <Grid>
                <Field label="Experience">
                  <select name="experience" value={form.experience} onChange={(e) => patch({ experience: e.target.value })} className="input capitalize">
                    {EXPERIENCES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Type">
                  <select name="type" value={form.type} onChange={(e) => patch({ type: e.target.value })} className="input capitalize">
                    {TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Temperament">
                  <select name="temperament" value={form.temperament} onChange={(e) => patch({ temperament: e.target.value })} className="input capitalize">
                    {TEMPERS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Care guide slug">
                  <select name="careGuide" value={form.careGuide} onChange={(e) => patch({ careGuide: e.target.value })} className="input">
                    <option value="">— none —</option>
                    {careGuides.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
              </Grid>
              <Grid>
                <Field label="Description (EN)"><textarea name="descriptionEn" value={form.descriptionEn} onChange={(e) => patch({ descriptionEn: e.target.value })} className="input min-h-28" /></Field>
                <Field label="Description (FR)"><textarea name="descriptionFr" value={form.descriptionFr} onChange={(e) => patch({ descriptionFr: e.target.value })} className="input min-h-28" /></Field>
              </Grid>
              <Grid>
                <Field label="Adult size (EN)"><input name="adultSizeEn" value={form.adultSizeEn} onChange={(e) => patch({ adultSizeEn: e.target.value })} className="input" /></Field>
                <Field label="Adult size (FR)"><input name="adultSizeFr" value={form.adultSizeFr} onChange={(e) => patch({ adultSizeFr: e.target.value })} className="input" /></Field>
                <Field label="Growth (EN)"><input name="growthEn" value={form.growthEn} onChange={(e) => patch({ growthEn: e.target.value })} className="input" /></Field>
                <Field label="Growth (FR)"><input name="growthFr" value={form.growthFr} onChange={(e) => patch({ growthFr: e.target.value })} className="input" /></Field>
                <Field label="Origin (EN)"><input name="originEn" value={form.originEn} onChange={(e) => patch({ originEn: e.target.value })} className="input" /></Field>
                <Field label="Origin (FR)"><input name="originFr" value={form.originFr} onChange={(e) => patch({ originFr: e.target.value })} className="input" /></Field>
                <Field label="Lifespan (EN)"><input name="lifespanEn" value={form.lifespanEn} onChange={(e) => patch({ lifespanEn: e.target.value })} className="input" /></Field>
                <Field label="Lifespan (FR)"><input name="lifespanFr" value={form.lifespanFr} onChange={(e) => patch({ lifespanFr: e.target.value })} className="input" /></Field>
                <Field label="Humidity"><input name="humidity" value={form.humidity} onChange={(e) => patch({ humidity: e.target.value })} className="input" /></Field>
                <Field label="Temperature"><input name="temperature" value={form.temperature} onChange={(e) => patch({ temperature: e.target.value })} className="input" /></Field>
                <Field label="Enclosure (EN)"><input name="enclosureEn" value={form.enclosureEn} onChange={(e) => patch({ enclosureEn: e.target.value })} className="input" /></Field>
                <Field label="Enclosure (FR)"><input name="enclosureFr" value={form.enclosureFr} onChange={(e) => patch({ enclosureFr: e.target.value })} className="input" /></Field>
                <Field label="Diet (EN)"><input name="dietEn" value={form.dietEn} onChange={(e) => patch({ dietEn: e.target.value })} className="input" /></Field>
                <Field label="Diet (FR)"><input name="dietFr" value={form.dietFr} onChange={(e) => patch({ dietFr: e.target.value })} className="input" /></Field>
              </Grid>
            </div>
          )}
        </section>

        {/* Advanced */}
        <section className="card-glow rounded-2xl p-5">
          <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setAdvancedOpen((o) => !o)}>
            <h2 className="font-display text-lg font-semibold text-cream">Advanced</h2>
            <span className="text-sm text-muted">{advancedOpen ? "Hide" : "Show"}</span>
          </button>
          {advancedOpen && (
            <div className="mt-4">
              <Field label="URL slug *">
                <input
                  name="slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    patch({ slug: e.target.value });
                  }}
                  className="input"
                  required
                />
              </Field>
              <p className="mt-2 text-xs text-muted">Auto-generated from scientific + common name. Edit only if needed.</p>
            </div>
          )}
          {!advancedOpen && <input type="hidden" name="slug" value={form.slug} />}
        </section>

        <label className="flex items-center gap-2 text-sm text-bone">
          <input type="checkbox" name="saveSpeciesTemplate" defaultChecked className="accent-[var(--gold)]" />
          Save species profile for future listings (recommended)
        </label>

        {state.error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {state.error === "storage_unconfigured"
              ? "Image storage isn't configured — set the Cloudinary env vars to upload photos."
              : `Could not save: ${state.error}`}
          </p>
        )}

        <div className="flex gap-3">
          <button className="btn btn-gold" disabled={pending}>{pending ? "Saving…" : "Save product"}</button>
          <Link href={localeHref(locale, "/admin")} className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-glow rounded-2xl p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-cream">{title}</h2>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Check({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-bone">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--gold)]"
      />
      {label}
    </label>
  );
}
