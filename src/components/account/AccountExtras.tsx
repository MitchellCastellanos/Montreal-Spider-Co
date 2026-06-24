"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LocaleLink from "@/components/LocaleLink";
import SpeciesImage from "@/components/SpeciesImage";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import FulfillmentPreferences, {
  type FulfillmentPrefsPayload,
} from "@/components/account/FulfillmentPreferences";
import type { PickupOption } from "@/components/checkout/PickupMeetupSection";

type WishlistRow = {
  id: string;
  productId: string;
  unitKey: string;
  slug: string;
  scientific: string;
  commonEn: string;
  commonFr: string;
  image?: string;
  hue: number;
  inStock: boolean;
  unitLabel: string;
  price: number;
};

type GuideRow = { slug: string; titleEn: string; titleFr: string; level: string; minRead: number };

export function WishlistTab() {
  const { dict, locale } = useI18n();
  const { add } = useCart();
  const a = dict.account;
  const [items, setItems] = useState<WishlistRow[]>([]);

  const load = () => {
    void fetch("/api/account/wishlist")
      .then((r) => r.json())
      .then((d: { items?: WishlistRow[] }) => setItems(d.items ?? []));
  };

  useEffect(load, []);

  const remove = async (id: string) => {
    await fetch(`/api/account/wishlist?id=${id}`, { method: "DELETE" });
    load();
  };

  const addToCart = (item: WishlistRow) => {
    add(item.productId, item.unitKey, 1, {
      slug: item.slug,
      scientific: item.scientific,
      common: { en: item.commonEn, fr: item.commonFr },
      hue: item.hue,
      accent: "#c9a24b",
      image: item.image,
      sizeLabel: item.unitLabel,
      price: item.price,
    });
  };

  if (items.length === 0) return <p className="text-bone">{a.wishlistEmpty}</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="card-glow flex gap-3 rounded-xl p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            <SpeciesImage image={item.image} hue={item.hue} accent="#c9a24b" alt={item.scientific} sizes="80px" />
          </div>
          <div className="min-w-0 flex-1">
            <LocaleLink href={`/product/${item.slug}`} className="font-semibold text-cream hover:text-gold-bright">
              {locale === "fr" ? item.commonFr || item.commonEn : item.commonEn}
            </LocaleLink>
            <p className="text-xs text-muted">{item.unitLabel || item.scientific}</p>
            <p className="text-sm text-gold-bright">{formatPrice(item.price, locale)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.inStock && (
                <button type="button" onClick={() => void addToCart(item)} className="btn btn-gold px-2 py-1 text-xs">
                  {dict.common.addToCart}
                </button>
              )}
              {!item.inStock && <span className="badge">{a.wishlistNotifyOn}</span>}
              <button type="button" onClick={() => void remove(item.id)} className="text-xs text-muted hover:text-danger">
                {dict.common.remove}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SavedGuidesTab() {
  const { dict, locale } = useI18n();
  const a = dict.account;
  const [guides, setGuides] = useState<GuideRow[]>([]);

  const load = () => {
    void fetch("/api/account/saved-guides")
      .then((r) => r.json())
      .then((d: { guides?: GuideRow[] }) => setGuides(d.guides ?? []));
  };

  useEffect(load, []);

  if (guides.length === 0) return <p className="text-bone">{a.guidesEmpty}</p>;

  return (
    <ul className="space-y-3">
      {guides.map((g) => (
        <li key={g.slug} className="card-glow flex items-center justify-between rounded-xl p-4">
          <div>
            <LocaleLink href={`/care/${g.slug}`} className="font-semibold text-cream hover:text-gold-bright">
              {locale === "fr" ? g.titleFr : g.titleEn}
            </LocaleLink>
            <p className="text-xs text-muted">
              {dict.filters[g.level as keyof typeof dict.filters]} · {g.minRead} {dict.care.minRead}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetch(`/api/account/saved-guides?slug=${g.slug}`, { method: "DELETE" }).then(load)}
            className="text-sm text-muted hover:text-danger"
          >
            {dict.common.remove}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function PreferencesTab({ pickups }: { pickups: PickupOption[] }) {
  const { dict } = useI18n();
  const { user, updateProfile } = useAuth();
  const a = dict.account;
  const prefs = user?.preferences;
  const [experience, setExperience] = useState(user?.experience ?? "");
  const [notifyStock, setNotifyStock] = useState(prefs?.notifyStock ?? true);
  const [notifyPromos, setNotifyPromos] = useState(prefs?.notifyPromos ?? true);
  const [notifyCare, setNotifyCare] = useState(prefs?.notifyCare ?? false);
  const [saved, setSaved] = useState(false);
  const fulfillmentRef = useRef<FulfillmentPrefsPayload | null>(null);

  const handleFulfillmentChange = useCallback((payload: FulfillmentPrefsPayload) => {
    fulfillmentRef.current = payload;
    setSaved(false);
  }, []);

  const save = async () => {
    await updateProfile({
      experience: experience || null,
      preferences: {
        notifyStock,
        notifyPromos,
        notifyCare,
        ...(fulfillmentRef.current ?? {}),
      },
    });
    setSaved(true);
  };

  return (
    <div className="card-glow max-w-3xl space-y-5 rounded-2xl p-6">
      <div>
        <p className="mb-2 text-sm font-medium text-cream">{a.experienceLabel}</p>
        <select className="input" value={experience} onChange={(e) => { setExperience(e.target.value); setSaved(false); }}>
          <option value="">{a.experienceNone}</option>
          <option value="beginner">{dict.filters.beginner}</option>
          <option value="intermediate">{dict.filters.intermediate}</option>
          <option value="advanced">{dict.filters.advanced}</option>
        </select>
        <p className="mt-1 text-xs text-muted">{a.experienceHint}</p>
      </div>

      <FulfillmentPreferences pickups={pickups} onChange={handleFulfillmentChange} />

      <div className="space-y-2">
        <p className="text-sm font-medium text-cream">{a.newsletterTitle}</p>
        <label className="flex items-center gap-2 text-sm text-bone">
          <input type="checkbox" checked={notifyStock} onChange={(e) => { setNotifyStock(e.target.checked); setSaved(false); }} className="accent-[var(--gold)]" />
          {a.notifyStock}
        </label>
        <label className="flex items-center gap-2 text-sm text-bone">
          <input type="checkbox" checked={notifyPromos} onChange={(e) => { setNotifyPromos(e.target.checked); setSaved(false); }} className="accent-[var(--gold)]" />
          {a.notifyPromos}
        </label>
        <label className="flex items-center gap-2 text-sm text-bone">
          <input type="checkbox" checked={notifyCare} onChange={(e) => { setNotifyCare(e.target.checked); setSaved(false); }} className="accent-[var(--gold)]" />
          {a.notifyCare}
        </label>
      </div>
      <button type="button" onClick={() => void save()} className="btn btn-gold">{dict.common.save}</button>
      {saved && <span className="ml-2 text-sm text-ok">✓</span>}
    </div>
  );
}

export function ReferralTab() {
  const { dict } = useI18n();
  const { user } = useAuth();
  const a = dict.account;
  const code = user?.referralCode ?? "";

  const copy = () => {
    void navigator.clipboard.writeText(code);
  };

  return (
    <div className="card-glow max-w-lg rounded-2xl p-6">
      <h3 className="font-display text-lg font-bold text-cream">{a.referralTitle}</h3>
      <p className="mt-2 text-sm text-bone">{a.referralBody}</p>
      <div className="mt-4 flex items-center gap-3">
        <code className="rounded-lg bg-ink-soft px-4 py-2 font-mono text-gold-bright">{code}</code>
        <button type="button" onClick={copy} className="btn btn-ghost text-sm">{a.referralCopy}</button>
      </div>
      <p className="mt-4 text-sm text-muted">{a.referralCount.replace("{count}", String(user?.referralCount ?? 0))}</p>
      {user?.coupons && user.coupons.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-sm font-medium text-cream">{a.yourCoupons}</p>
          <ul className="mt-2 space-y-1 text-sm text-bone">
            {user.coupons.map((c) => (
              <li key={c.code}>
                <span className="font-mono text-gold-bright">{c.code}</span>
                {" — "}
                {c.type === "percent" ? `${c.value}%` : `$${c.value}`} {a.couponOff}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
