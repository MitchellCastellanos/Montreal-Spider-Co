"use client";

import { useEffect, useMemo, useState } from "react";
import LocaleLink from "@/components/LocaleLink";
import SpeciesImage from "@/components/SpeciesImage";
import { useCart } from "@/context/CartContext";
import { useAuth, type User } from "@/context/AuthContext";
import { useI18n, useT } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import {
  MEETUP_ZONES,
  type MeetupAvailability,
  type PickupSubtype,
  calcMeetupFee,
  getLinesForZone,
  getMeetupZone,
  getStationsForZoneAndLine,
} from "@/lib/metro-meetup";
import { SITE } from "@/lib/site";
import ConceptInfo from "@/components/ConceptInfo";
import PickupMeetupSection, {
  type PickupOption,
  PickupMeetupSummary,
} from "@/components/checkout/PickupMeetupSection";

type CheckoutAuthMode = "signin" | "guest";

function contactFromUser(user: User) {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
  };
}

export type { PickupOption };

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
  const { resolved, subtotal } = useCart();
  const { user, ready, login, register, signOut, updateProfile } = useAuth();
  const co = dict.checkout;

  const [authMode, setAuthMode] = useState<CheckoutAuthMode>("signin");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(false);

  const [pickupSubtype, setPickupSubtype] = useState<PickupSubtype>("pickup_point");
  const [pickupId, setPickupId] = useState(pickups[0]?.id ?? "");
  const [meetupZoneId, setMeetupZoneId] = useState(MEETUP_ZONES[0].id);
  const initialMeetupLine = getLinesForZone(MEETUP_ZONES[0].id)[0]?.id ?? "";
  const [metroLineId, setMetroLineId] = useState(initialMeetupLine);
  const [metroStationId, setMetroStationId] = useState(
    getStationsForZoneAndLine(MEETUP_ZONES[0].id, initialMeetupLine)[0]?.id ?? "",
  );
  const [meetupAvailability, setMeetupAvailability] = useState<MeetupAvailability>("flexible");
  const [customMeetupRequest, setCustomMeetupRequest] = useState("");
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const meetupZone = getMeetupZone(meetupZoneId);
  const fulfillmentFee = useMemo(() => {
    if (pickupSubtype === "metro_meetup" && meetupZone) {
      return calcMeetupFee(subtotal, meetupZone);
    }
    return 0;
  }, [pickupSubtype, meetupZone, subtotal]);
  const tax = useMemo(() => (subtotal + fulfillmentFee) * SITE.taxRate, [subtotal, fulfillmentFee]);
  const total = subtotal + fulfillmentFee + tax;

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!user) return;
    const contact = contactFromUser(user);
    setForm((f) => ({ ...f, ...contact }));
  }, [user]);

  const showContactForm = Boolean(user) || authMode === "guest";

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    if (!loginEmail.trim() || !loginPwd) {
      setSignInError(co.signInFields);
      return;
    }
    const err = await login(loginEmail, loginPwd);
    if (err) setSignInError(err);
  };

  const syncAccountBeforeCheckout = async (): Promise<string | null> => {
    if (user) {
      await updateProfile({ name: form.name, phone: form.phone });
      return null;
    }
    if (createAccount) {
      if (guestPassword.length < 8) return co.passwordMin;
      return await register({
        email: form.email,
        password: guestPassword,
        name: form.name,
        phone: form.phone,
      });
    }
    return null;
  };

  if (!ready) {
    return <div className="container-x py-20 text-muted">{dict.common.loading}</div>;
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
    if (pickupSubtype === "metro_meetup") {
      if (!metroStationId) e.metroStation = true;
      if (!metroLineId) e.metroLine = true;
      if (!meetupAvailability) e.meetupAvailability = true;
    } else if (pickupSubtype === "custom_meetup") {
      if (!customMeetupRequest.trim()) e.customMeetup = true;
    }
    if (createAccount && guestPassword.length < 8) e.password = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) return;
    if (!stripeEnabled) {
      setPayError(co.paymentsUnavailable);
      return;
    }

    const accountErr = await syncAccountBeforeCheckout();
    if (accountErr) {
      setPayError(accountErr);
      return;
    }

    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          method: "pickup",
          pickupId: pickupSubtype === "pickup_point" ? pickupId : undefined,
          pickupSubtype,
          metroStationId: pickupSubtype === "metro_meetup" ? metroStationId : undefined,
          meetupAvailability: pickupSubtype === "metro_meetup" ? meetupAvailability : undefined,
          customMeetupRequest: pickupSubtype === "custom_meetup" ? customMeetupRequest : undefined,
          items: resolved.map((l) => ({ productId: l.productId, unitKey: l.unitKey, qty: l.qty })),
          customer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
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
              {createAccount && (
                <div className="mt-4">
                  <Field label={dict.common.password} error={errors.password}>
                    <input
                      type="password"
                      className="input"
                      value={guestPassword}
                      onChange={(e) => setGuestPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                    />
                  </Field>
                </div>
              )}
            </Section>
          )}

          {/* Delivery method */}
          {showContactForm && (
          <Section
            title={
              <span className="inline-flex items-center">
                {co.fulfillment}
                <ConceptInfo concept="pickup" className="ml-2" />
              </span>
            }
          >
            <PickupMeetupSection
              pickups={pickups}
              pickupPolicy={pickupPolicy}
              pickupSubtype={pickupSubtype}
              onPickupSubtypeChange={setPickupSubtype}
              pickupId={pickupId}
              onPickupIdChange={setPickupId}
              meetupZoneId={meetupZoneId}
              onMeetupZoneIdChange={setMeetupZoneId}
              metroLineId={metroLineId}
              onMetroLineIdChange={setMetroLineId}
              metroStationId={metroStationId}
              onMetroStationIdChange={setMetroStationId}
              meetupAvailability={meetupAvailability}
              onMeetupAvailabilityChange={setMeetupAvailability}
              customMeetupRequest={customMeetupRequest}
              onCustomMeetupRequestChange={setCustomMeetupRequest}
              subtotal={subtotal}
              errors={errors}
            />
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
              <p className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-bone">
                {co.paymentsUnavailable}
              </p>
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
                    <p className="text-xs text-muted">{l.size.label} × {l.qty}</p>
                  </div>
                  <span className="text-sm text-bone">{formatPrice(l.lineTotal, locale)}</span>
                </li>
              ))}
            </ul>
            <div className="my-4 h-px bg-line" />
            <div className="space-y-2 text-sm">
              <Row label={dict.cart.subtotal} value={formatPrice(subtotal, locale)} />
              <Row
                label={co.pickupMeetupFee}
                value={fulfillmentFee === 0 ? dict.common.free : formatPrice(fulfillmentFee, locale)}
              />
              <Row label={co.tax} value={formatPrice(tax, locale)} muted />
            </div>
            <PickupMeetupSummary
              pickupSubtype={pickupSubtype}
              pickups={pickups}
              pickupId={pickupId}
              meetupZoneId={meetupZoneId}
              metroLineId={metroLineId}
              metroStationId={metroStationId}
              meetupAvailability={meetupAvailability}
              customMeetupRequest={customMeetupRequest}
              fulfillmentFee={fulfillmentFee}
            />
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
              disabled={paying || !showContactForm || !stripeEnabled}
              className="btn btn-gold mt-4 w-full text-base disabled:opacity-60"
            >
              {paying ? co.processing : co.continueToPayment}
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

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
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
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-bone">{label}</span>
      <span className={muted ? "text-muted" : "text-cream"}>{value}</span>
    </div>
  );
}
