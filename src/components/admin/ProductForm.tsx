"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { saveProductAction, generateSpeciesContent, type ActionState } from "@/app/[locale]/admin/actions";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/lib/href";
import type { Product } from "@/lib/types";
import type { LibraryImage } from "@/lib/data/species-library";
import type { SpeciesProfile } from "@/lib/data/species";
import ProductImageField from "@/components/admin/ProductImageField";
import {
  DEFAULT_SIZE_ROWS,
  deriveAccent,
  deriveGenus,
  deriveHue,
  deriveSlug,
  emptySpeciesFields,
  type SpeciesFormFields,
} from "@/lib/species-utils";

interface SizeRow {
  key: string;
  labelEn: string;
  labelFr: string;
  price: number;
  stock: number;
}

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
    rating: product.rating,
    reviews: product.reviews,
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
    rating: 5,
    reviews: 0,
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

export default function ProductForm({
  product,
  careGuides,
  defaultProductImage,
  libraryImages,
  speciesList,
}: {
  product: Product | null;
  careGuides: string[];
  defaultProductImage: string | null;
  libraryImages: LibraryImage[];
  speciesList: SpeciesProfile[];
}) {
  const { locale } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProductAction, {});
  const [aiPending, startAi] = useTransition();

  const initial = product ? productToForm(product) : emptySpeciesFields();
  const [form, setForm] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [selectedSpeciesId, setSelectedSpeciesId] = useState("");
  const [aiNotes, setAiNotes] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(!product);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [sizes, setSizes] = useState<SizeRow[]>(
    product
      ? product.sizes.map((s) => ({ key: s.id, labelEn: s.label.en, labelFr: s.label.fr, price: s.price, stock: s.stock }))
      : DEFAULT_SIZE_ROWS.map((s) => ({ ...s }))
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

  const runAi = () => {
    if (!form.scientific.trim()) {
      setAiError("Enter a scientific name first.");
      return;
    }
    setAiError(null);
    startAi(async () => {
      const result = await generateSpeciesContent(form.scientific, aiNotes);
      if (result.error) {
        setAiError(result.error);
        return;
      }
      if (result.profile) {
        const p = result.profile;
        patch({
          commonEn: p.commonEn,
          commonFr: p.commonFr,
          genus: p.genus,
          experience: p.experience,
          type: p.type,
          temperament: p.temperament,
          hue: p.hue,
          accent: p.accent,
          careGuide: p.careGuide ?? "",
          adultSizeEn: p.adultSizeEn,
          adultSizeFr: p.adultSizeFr,
          growthEn: p.growthEn,
          growthFr: p.growthFr,
          originEn: p.originEn,
          originFr: p.originFr,
          lifespanEn: p.lifespanEn,
          lifespanFr: p.lifespanFr,
          humidity: p.humidity,
          temperature: p.temperature,
          enclosureEn: p.enclosureEn,
          enclosureFr: p.enclosureFr,
          dietEn: p.dietEn,
          dietFr: p.dietFr,
          descriptionEn: p.descriptionEn,
          descriptionFr: p.descriptionFr,
          slug: slugTouched ? form.slug : deriveSlug(p.scientific, p.commonEn),
        });
        setDetailsOpen(true);
        setSelectedSpeciesId("");
      }
    });
  };

  const setSize = (i: number, patchSize: Partial<SizeRow>) =>
    setSizes((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patchSize } : s)));
  const addSize = () => setSizes((prev) => [...prev, { key: `s${prev.length + 1}`, labelEn: "", labelFr: "", price: 0, stock: 0 }]);
  const removeSize = (i: number) => setSizes((prev) => prev.filter((_, idx) => idx !== i));

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
        <input type="hidden" name="sizes" value={JSON.stringify(sizes)} />
        <input type="hidden" name="rating" value={form.rating} />
        <input type="hidden" name="reviews" value={form.reviews} />
        <input type="hidden" name="hue" value={form.hue} />
        <input type="hidden" name="accent" value={form.accent} />

        {/* Species library picker */}
        {speciesList.length > 0 && (
          <Section title="Load from species library">
            <p className="mb-3 text-sm text-bone">
              Pick a saved species profile to auto-fill description, specs, and care. You only set sizes, prices, and stock.
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

        {/* AI generator */}
        <Section title="Generate species content (AI)">
          <p className="mb-3 text-sm text-bone">
            Enter the scientific name above, add optional notes, then generate description + specs in EN &amp; FR. Review before saving.
          </p>
          <Field label="Notes for AI (optional)">
            <input
              value={aiNotes}
              onChange={(e) => setAiNotes(e.target.value)}
              placeholder="e.g. slings 2–3 cm, docile beginner species"
              className="input"
            />
          </Field>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-gold" onClick={runAi} disabled={aiPending || !form.scientific.trim()}>
              {aiPending ? "Generating…" : "✨ Generate EN + FR content"}
            </button>
            {aiError && (
              <p className="text-sm text-danger">
                {aiError.includes("OPENAI_API_KEY") ? "Add OPENAI_API_KEY to .env.local to use AI generation." : aiError}
              </p>
            )}
          </div>
        </Section>

        {/* Sizes */}
        <Section title="Sizes & stock">
          <div className="space-y-3">
            {sizes.map((s, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3 sm:grid-cols-[80px_1fr_1fr_100px_80px_40px]">
                <input value={s.key} onChange={(e) => setSize(i, { key: e.target.value })} className="input" placeholder="key" aria-label="key" />
                <input value={s.labelEn} onChange={(e) => setSize(i, { labelEn: e.target.value })} className="input" placeholder="Label EN" />
                <input value={s.labelFr} onChange={(e) => setSize(i, { labelFr: e.target.value })} className="input" placeholder="Label FR" />
                <input type="number" step="0.01" value={s.price} onChange={(e) => setSize(i, { price: Number(e.target.value) })} className="input" placeholder="Price" />
                <input type="number" value={s.stock} onChange={(e) => setSize(i, { stock: Number(e.target.value) })} className="input" placeholder="Stock" />
                <button type="button" onClick={() => removeSize(i)} className="rounded-lg border border-line text-muted hover:border-danger hover:text-danger" aria-label="remove">×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSize} className="btn btn-ghost mt-3">+ Add size</button>
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
