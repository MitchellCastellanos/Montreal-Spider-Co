"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveProductAction, type ActionState } from "@/app/[locale]/admin/actions";
import { useI18n } from "@/i18n/I18nProvider";
import { localeHref } from "@/lib/href";
import type { Product } from "@/lib/types";

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

export default function ProductForm({
  product,
  careGuides,
}: {
  product: Product | null;
  careGuides: string[];
}) {
  const { locale } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProductAction, {});

  const [sizes, setSizes] = useState<SizeRow[]>(
    product
      ? product.sizes.map((s) => ({ key: s.id, labelEn: s.label.en, labelFr: s.label.fr, price: s.price, stock: s.stock }))
      : [{ key: "s", labelEn: "Sling (2–3 cm)", labelFr: "Jeune (2–3 cm)", price: 0, stock: 0 }]
  );
  const [preview, setPreview] = useState<string | null>(product?.image ?? null);

  const setSize = (i: number, patch: Partial<SizeRow>) =>
    setSizes((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
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
        <input type="hidden" name="currentImage" value={preview && !preview.startsWith("blob:") ? preview : product?.image ?? ""} />

        {/* Identity */}
        <Section title="Identity">
          <Grid>
            <Field label="Common name (EN) *"><input name="commonEn" defaultValue={product?.common.en} className="input" required /></Field>
            <Field label="Common name (FR)"><input name="commonFr" defaultValue={product?.common.fr} className="input" /></Field>
            <Field label="Scientific name *"><input name="scientific" defaultValue={product?.scientific} className="input" required /></Field>
            <Field label="Slug *"><input name="slug" defaultValue={product?.slug} className="input" placeholder="genus-species-common" required /></Field>
            <Field label="Genus"><input name="genus" defaultValue={product?.genus} className="input" /></Field>
            <Field label="Care guide slug">
              <select name="careGuide" defaultValue={product?.careGuide ?? ""} className="input">
                <option value="">— none —</option>
                {careGuides.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </Grid>
        </Section>

        {/* Classification */}
        <Section title="Classification">
          <Grid>
            <Field label="Experience"><Select name="experience" options={EXPERIENCES} value={product?.experience} /></Field>
            <Field label="Type"><Select name="type" options={TYPES} value={product?.type} /></Field>
            <Field label="Temperament"><Select name="temperament" options={TEMPERS} value={product?.temperament} /></Field>
            <Field label="Rating (0–5)"><input name="rating" type="number" step="0.1" min="0" max="5" defaultValue={product?.rating ?? 5} className="input" /></Field>
            <Field label="Reviews"><input name="reviews" type="number" min="0" defaultValue={product?.reviews ?? 0} className="input" /></Field>
            <Field label="Accent hue (0–360)"><input name="hue" type="number" min="0" max="360" defaultValue={product?.hue ?? 36} className="input" /></Field>
            <Field label="Accent color"><input name="accent" defaultValue={product?.accent ?? "#c9a24b"} className="input" /></Field>
          </Grid>
          <div className="mt-3 flex gap-6">
            <Check name="featured" label="Featured" defaultChecked={product?.featured} />
            <Check name="newArrival" label="New arrival" defaultChecked={product?.newArrival} />
          </div>
        </Section>

        {/* Image */}
        <Section title="Photo">
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-line bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted">No photo</span>}
            </div>
            <label className="field flex-1">
              <span>Upload a photo (replaces current)</span>
              <input
                type="file"
                name="imageFile"
                accept="image/*"
                className="input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPreview(URL.createObjectURL(f));
                }}
              />
            </label>
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

        {/* Description */}
        <Section title="Description">
          <Grid>
            <Field label="Description (EN)"><textarea name="descriptionEn" defaultValue={product?.description.en} className="input min-h-28" /></Field>
            <Field label="Description (FR)"><textarea name="descriptionFr" defaultValue={product?.description.fr} className="input min-h-28" /></Field>
          </Grid>
        </Section>

        {/* Specs */}
        <Section title="Specs & care">
          <Grid>
            <Field label="Adult size (EN)"><input name="adultSizeEn" defaultValue={product?.adultSize.en} className="input" /></Field>
            <Field label="Adult size (FR)"><input name="adultSizeFr" defaultValue={product?.adultSize.fr} className="input" /></Field>
            <Field label="Growth (EN)"><input name="growthEn" defaultValue={product?.growth.en} className="input" /></Field>
            <Field label="Growth (FR)"><input name="growthFr" defaultValue={product?.growth.fr} className="input" /></Field>
            <Field label="Origin (EN)"><input name="originEn" defaultValue={product?.origin.en} className="input" /></Field>
            <Field label="Origin (FR)"><input name="originFr" defaultValue={product?.origin.fr} className="input" /></Field>
            <Field label="Lifespan (EN)"><input name="lifespanEn" defaultValue={product?.lifespan.en} className="input" /></Field>
            <Field label="Lifespan (FR)"><input name="lifespanFr" defaultValue={product?.lifespan.fr} className="input" /></Field>
            <Field label="Humidity"><input name="humidity" defaultValue={product?.humidity} className="input" /></Field>
            <Field label="Temperature"><input name="temperature" defaultValue={product?.temperature} className="input" /></Field>
            <Field label="Enclosure (EN)"><input name="enclosureEn" defaultValue={product?.enclosure.en} className="input" /></Field>
            <Field label="Enclosure (FR)"><input name="enclosureFr" defaultValue={product?.enclosure.fr} className="input" /></Field>
            <Field label="Diet (EN)"><input name="dietEn" defaultValue={product?.diet.en} className="input" /></Field>
            <Field label="Diet (FR)"><input name="dietFr" defaultValue={product?.diet.fr} className="input" /></Field>
          </Grid>
        </Section>

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
function Select({ name, options, value }: { name: string; options: string[]; value?: string }) {
  return (
    <select name={name} defaultValue={value ?? options[0]} className="input capitalize">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-bone">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="accent-[var(--gold)]" />
      {label}
    </label>
  );
}
