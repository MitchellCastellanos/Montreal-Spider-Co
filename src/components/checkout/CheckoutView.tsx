"use client";

import { useEffect, useMemo, useState } from "react";
import LocaleLink from "@/components/LocaleLink";
import SpeciesImage from "@/components/SpeciesImage";
import { useCart } from "@/context/CartContext";
import { useAuth, type Order, type User } from "@/context/AuthContext";
import { useI18n, useT } from "@/i18n/I18nProvider";
import { formatPrice, maskCard } from "@/lib/format";
import { formatWeeklyHoursSummary } from "@/lib/opening-hours";
import type { WeeklyHours } from "@/lib/opening-hours";
import { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD } from "@/lib/locations";
import { t } from "@/lib/types";
import { SITE } from "@/lib/site";

type Method = "delivery" | "pickup";
type CheckoutAuthMode = "signin" | "guest";

function contactFromUser(user: User) {
  const defaultAddr = user.addresses.find((a) => a.isDefault) ?? user.addresses[0];
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: defaultAddr?.line1 ?? "",
    city: defaultAddr?.city ?? "",
    postal: defaultAddr?.postal ?? "",
  };
}

export interface PickupOption {
  id: string;
  name: string;
  neighborhood: string;
  hours: WeeklyHours;
}

export default function CheckoutView({
  pickups,
  pickupPolicy,
  stripeEnabled = false,
}: {
  pickups: PickupOption[];
  pickupPolicy: string;
  stripeEnabled?: boolean;
}) {
  const { dict, locale } = useI18n();
  const tr = useT();
  const { resolved, subtotal, clear } = useCart();
  const { user, ready, signIn, trySignIn, signOut, addOrder, addCard, updateProfile } = useAuth();
  const co = dict.checkout;

  const [authMode, setAuthMode] = useState<CheckoutAuthMode>("signin");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(false);

  const [method, setMethod] = useState<Method>("delivery");
  const [zoneId, setZoneId] = useState(DELIVERY_ZONES[0].id);
  const [pickupId, setPickupId] = useState(pickups[0]?.id ?? "");
  const [useSaved, setUseSaved] = useState<string | null>(user?.cards.find((c) => c.isDefault)?.id ?? user?.cards[0]?.id ?? null);
  const [saveCard, setSaveCard] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    address: "",
    city: "",
    postal: "",
    cardName: "",
    cardNumber: "",
    cardExp: "",
    cardCvc: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [placed, setPlaced] = useState<Order | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId)!;
  const deliveryFee = method === "pickup" ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : zone.fee;
  const tax = useMemo(() => (subtotal + deliveryFee) * SITE.taxRate, [subtotal, deliveryFee]);
  const total = subtotal + deliveryFee + tax;

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!user) return;
    const contact = contactFromUser(user);
    setForm((f) => ({ ...f, ...contact }));
  }, [user]);

  const showContactForm = Boolean(user) || authMode === "guest";

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    if (!loginEmail.trim() || !loginPwd) {
      setSignInError(co.signInFields);
      return;
    }
    if (!trySignIn(loginEmail)) {
      setSignInError(co.signInError);
      return;
    }
  };

  const syncAccountBeforeCheckout = () => {
    if (user) {
      updateProfile({ name: form.name, phone: form.phone });
      return;
    }
    if (createAccount) {
      signIn(form.email, form.name, form.phone);
    }
  };

  if (!ready) {
    return <div className="container-x py-20 text-muted">{dict.common.loading}</div>;
  }

  if (placed) {
    return <Success order={placed} />;
  }

  if (resolved.length === 0) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-cream">{dict.cart.empty}</h1>
        <LocaleLink href="/shop" className="btn btn-gold mt-6">{dict.cart.browse}</LocaleLink>
      </div>
    );
  }

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!showContactForm) {
      setErrors(e);
      return false;
    }
    if (!form.name) e.name = true;
    if (!form.email) e.email = true;
    if (!form.phone) e.phone = true;
    if (method === "delivery") {
      if (!form.address) e.address = true;
      if (!form.city) e.city = true;
      if (!form.postal) e.postal = true;
    }
    const payingNew = !stripeEnabled && !useSaved;
    if (payingNew) {
      if (!form.cardName) e.cardName = true;
      if (form.cardNumber.replace(/\s/g, "").length < 12) e.cardNumber = true;
      if (!form.cardExp) e.cardExp = true;
      if (!form.cardCvc) e.cardCvc = true;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) return;

    syncAccountBeforeCheckout();

    if (stripeEnabled) {
      setPaying(true);
      setPayError(null);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            method,
            zoneId: method === "delivery" ? zoneId : undefined,
            pickupId: method === "pickup" ? pickupId : undefined,
            items: resolved.map((l) => ({ productId: l.productId, sizeId: l.sizeId, qty: l.qty })),
            customer: {
              name: form.name,
              email: form.email,
              phone: form.phone,
              address: form.address,
              city: form.city,
              postal: form.postal,
              notes: form.notes,
            },
          }),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setPayError(data.error ?? co.paymentError);
          return;
        }
        window.location.href = data.url;
      } catch {
        setPayError(co.paymentError);
      } finally {
        setPaying(false);
      }
      return;
    }

    const order: Order = {
      id: `MSC-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      total,
      status: method === "pickup" ? "ready" : "processing",
      method,
      items: resolved.map((l) => ({
        name: tr(l.product.common),
        size: tr(l.size.label),
        qty: l.qty,
        price: l.size.price,
      })),
    };

    // Demo: ensure a session so the order is stored against an account.
    if (!user && !createAccount && form.email) signIn(form.email, form.name, form.phone);

    if (!useSaved && saveCard && form.cardNumber) {
      addCard({
        brand: "Visa",
        last4: form.cardNumber.replace(/\D/g, "").slice(-4) || "0000",
        exp: form.cardExp,
        name: form.cardName,
      });
    }

    addOrder(order);
    clear();
    setPlaced(order);
  };

  return (
    <div className="container-x py-12">
      <h1 className="mb-8 font-display text-4xl font-bold text-cream">{co.title}</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Account / contact */}
          {user ? (
            <Section title={co.contact}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3">
                <p className="text-sm text-bone">
                  <span className="text-muted">{co.signedInAs}</span>{" "}
                  <span className="font-semibold text-cream">{user.name}</span>
                  <span className="text-muted"> · {user.email}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setAuthMode("signin");
                    setLoginEmail("");
                    setLoginPwd("");
                  }}
                  className="text-sm font-medium text-gold-bright hover:underline"
                >
                  {co.signOutCheckout}
                </button>
              </div>
              <ContactFields form={form} set={set} errors={errors} dict={dict} />
            </Section>
          ) : authMode === "signin" ? (
            <Section title={co.account}>
              <p className="mb-4 text-sm text-bone">{co.signInPrompt}</p>
              <form onSubmit={handleSignIn} className="space-y-4">
                <Field label={dict.common.email} error={signInError !== null && !loginEmail}>
                  <input
                    type="email"
                    className="input"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                  />
                </Field>
                <Field label={dict.common.password} error={signInError !== null && !loginPwd}>
                  <input
                    type="password"
                    className="input"
                    value={loginPwd}
                    onChange={(e) => setLoginPwd(e.target.value)}
                    autoComplete="current-password"
                  />
                </Field>
                {signInError && <p className="text-sm text-danger">{signInError}</p>}
                <button type="submit" className="btn btn-gold w-full sm:w-auto">
                  {co.signInCheckout}
                </button>
              </form>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("guest");
                    setSignInError(null);
                  }}
                  className="font-medium text-gold-bright hover:underline"
                >
                  {co.continueAsGuest}
                </button>
              </div>
            </Section>
          ) : (
            <Section title={co.guestCheckout}>
              <p className="mb-4 text-sm text-bone">{co.guestNote}</p>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setSignInError(null);
                }}
                className="mb-4 text-sm font-medium text-gold-bright hover:underline"
              >
                {co.signInInstead}
              </button>
              <ContactFields form={form} set={set} errors={errors} dict={dict} />
              <label className="mt-4 flex items-start gap-3 rounded-xl border border-line p-4">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                  className="mt-0.5 accent-[var(--gold)]"
                />
                <span>
                  <span className="block text-sm font-medium text-cream">{co.createAccount}</span>
                  <span className="mt-1 block text-xs text-muted">{co.createAccountHint}</span>
                </span>
              </label>
            </Section>
          )}

          {/* Delivery method */}
          {showContactForm && (
          <Section title={co.delivery}>
            <div className="grid gap-3 sm:grid-cols-2">
              <MethodCard active={method === "delivery"} onClick={() => setMethod("delivery")} title={co.deliveryLocal} desc={co.deliveryLocalDesc} />
              <MethodCard active={method === "pickup"} onClick={() => setMethod("pickup")} title={co.deliveryPickup} desc={co.deliveryPickupDesc} badge={dict.common.free} />
            </div>

            {method === "delivery" ? (
              <div className="mt-4 space-y-4">
                <Field label={co.selectZone}>
                  <select className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                    {DELIVERY_ZONES.map((z) => (
                      <option key={z.id} value={z.id}>{t(z.name, locale)} — {formatPrice(z.fee, locale)} · {t(z.eta, locale)}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={co.address} error={errors.address}>
                    <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} autoComplete="address-line1" />
                  </Field>
                  <Field label={co.city} error={errors.city}>
                    <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
                  </Field>
                  <Field label={co.postal} error={errors.postal}>
                    <input className="input" value={form.postal} onChange={(e) => set("postal", e.target.value)} placeholder="H2X 1Y4" autoComplete="postal-code" />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <Field label={co.selectPickup}>
                  <select className="input" value={pickupId} onChange={(e) => setPickupId(e.target.value)}>
                    {pickups.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.neighborhood}</option>
                    ))}
                  </select>
                </Field>
                {pickups.find((p) => p.id === pickupId) && (
                  <p className="mt-2 text-sm text-bone">
                    {formatWeeklyHoursSummary(pickups.find((p) => p.id === pickupId)!.hours, locale)}
                  </p>
                )}
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-gold/25 bg-gold/5 p-3 text-xs leading-relaxed text-bone">
                  <span className="text-gold-bright">⏳</span>
                  <span>{pickupPolicy}</span>
                </div>
              </div>
            )}
          </Section>
          )}

          {/* Payment */}
          {showContactForm && (
          <Section title={co.payment}>
            {stripeEnabled ? (
              <p className="rounded-lg border border-line bg-ink-soft/60 p-4 text-sm text-bone">
                🔒 {co.stripeNote}
              </p>
            ) : (
              <>
            {user && user.cards.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-gold-deep">{co.savedCards}</p>
                {user.cards.map((card) => (
                  <label key={card.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${useSaved === card.id ? "border-gold bg-gold/10" : "border-line"}`}>
                    <input type="radio" name="card" checked={useSaved === card.id} onChange={() => setUseSaved(card.id)} className="accent-[var(--gold)]" />
                    <span className="text-sm text-cream">{card.brand} {maskCard(card.last4)}</span>
                    <span className="ml-auto text-xs text-muted">{card.exp}</span>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${useSaved === null ? "border-gold bg-gold/10" : "border-line"}`}>
                  <input type="radio" name="card" checked={useSaved === null} onChange={() => setUseSaved(null)} className="accent-[var(--gold)]" />
                  <span className="text-sm text-cream">{co.useNewCard}</span>
                </label>
              </div>
            )}

            {useSaved === null && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label={co.cardName} error={errors.cardName}>
                    <input className="input" value={form.cardName} onChange={(e) => set("cardName", e.target.value)} autoComplete="cc-name" />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label={co.cardNumber} error={errors.cardNumber}>
                    <input className="input" value={form.cardNumber} onChange={(e) => set("cardNumber", e.target.value)} placeholder="4242 4242 4242 4242" inputMode="numeric" autoComplete="cc-number" />
                  </Field>
                </div>
                <Field label={co.cardExp} error={errors.cardExp}>
                  <input className="input" value={form.cardExp} onChange={(e) => set("cardExp", e.target.value)} placeholder="12/28" autoComplete="cc-exp" />
                </Field>
                <Field label={co.cardCvc} error={errors.cardCvc}>
                  <input className="input" value={form.cardCvc} onChange={(e) => set("cardCvc", e.target.value)} placeholder="123" inputMode="numeric" autoComplete="cc-csc" />
                </Field>
                <label className="sm:col-span-2 flex items-center gap-2 text-sm text-bone">
                  <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="accent-[var(--gold)]" />
                  {co.saveCard}
                </label>
              </div>
            )}

            <p className="mt-4 rounded-lg border border-line bg-ink-soft/60 p-3 text-xs text-muted">🔒 {co.demoNote}</p>
              </>
            )}
          </Section>
          )}

          {showContactForm && (
          <Section title={co.notesLabel}>
            <textarea className="input min-h-24 resize-y" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={co.notesPlaceholder} />
          </Section>
          )}
        </div>

        {/* Summary */}
        <aside>
          <div className="card-glow sticky top-24 rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold text-cream">{co.summary}</h2>
            <ul className="mt-4 space-y-3">
              {resolved.map((l) => (
                <li key={l.key} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-ink">
                    <SpeciesImage image={l.product.image} hue={l.product.hue} accent={l.product.accent} alt={tr(l.product.common)} sizes="48px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cream">{tr(l.product.common)}</p>
                    <p className="text-xs text-muted">{tr(l.size.label)} × {l.qty}</p>
                  </div>
                  <span className="text-sm text-bone">{formatPrice(l.lineTotal, locale)}</span>
                </li>
              ))}
            </ul>
            <div className="my-4 h-px bg-line" />
            <div className="space-y-2 text-sm">
              <Row label={dict.cart.subtotal} value={formatPrice(subtotal, locale)} />
              <Row label={co.deliveryFee} value={deliveryFee === 0 ? dict.common.free : formatPrice(deliveryFee, locale)} />
              <Row label={co.tax} value={formatPrice(tax, locale)} muted />
            </div>
            <div className="my-4 h-px bg-line" />
            <div className="flex items-center justify-between">
              <span className="text-bone">{dict.common.total}</span>
              <span className="font-display text-2xl font-bold text-cream">{formatPrice(total, locale)}</span>
            </div>
            {Object.keys(errors).length > 0 && (
              <p className="mt-3 text-center text-sm text-danger">{co.missingFields}</p>
            )}
            {payError && (
              <p className="mt-3 text-center text-sm text-danger">{payError}</p>
            )}
            <button
              onClick={placeOrder}
              disabled={paying || !showContactForm}
              className="btn btn-gold mt-4 w-full text-base disabled:opacity-60"
            >
              {paying ? co.processing : stripeEnabled ? co.continueToPayment : co.placeOrder}
            </button>
            {!showContactForm && (
              <p className="mt-3 text-center text-xs text-muted">{co.signInPrompt}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Success({ order }: { order: Order }) {
  const { dict, locale } = useI18n();
  const co = dict.checkout;
  return (
    <div className="container-x py-20">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-ok/15 text-4xl text-ok pulse-ring">✓</div>
        <h1 className="font-display text-4xl font-bold text-cream">{co.successTitle}</h1>
        <p className="mt-3 text-bone">{co.successBody}</p>
        <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5">
          <p className="text-xs uppercase tracking-wide text-muted">{co.orderNumber}</p>
          <p className="font-display text-2xl font-bold text-gold-bright">{order.id}</p>
          <p className="mt-2 text-bone">{formatPrice(order.total, locale)}</p>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <LocaleLink href="/account" className="btn btn-gold">{co.viewOrders}</LocaleLink>
          <LocaleLink href="/shop" className="btn btn-ghost">{co.keepShopping}</LocaleLink>
        </div>
      </div>
    </div>
  );
}

function ContactFields({
  form,
  set,
  errors,
  dict,
}: {
  form: { name: string; email: string; phone: string };
  set: (k: "name" | "email" | "phone", v: string) => void;
  errors: Record<string, boolean>;
  dict: { common: { name: string; email: string; phone: string } };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={dict.common.name} error={errors.name}>
        <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
      </Field>
      <Field label={dict.common.email} error={errors.email}>
        <input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
      </Field>
      <Field label={dict.common.phone} error={errors.phone}>
        <input type="tel" className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="514-555-0142" autoComplete="tel" />
      </Field>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-glow rounded-2xl p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-cream">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className={error ? "text-danger" : ""}>{label}</span>
      <div className={error ? "rounded-md ring-1 ring-danger" : ""}>{children}</div>
    </label>
  );
}
function MethodCard({ active, onClick, title, desc, badge }: { active: boolean; onClick: () => void; title: string; desc: string; badge?: string }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left transition ${active ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-cream">{title}</span>
        {badge && <span className="badge">{badge}</span>}
      </div>
      <p className="mt-1 text-sm text-bone">{desc}</p>
    </button>
  );
}
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-bone">{label}</span>
      <span className={muted ? "text-muted" : "text-cream"}>{value}</span>
    </div>
  );
}
