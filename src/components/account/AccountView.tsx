"use client";

import { useState } from "react";
import { useAuth, type Order } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice, formatDate } from "@/lib/format";
import SpiderGraphic from "@/components/SpiderGraphic";
import { PreferencesTab, ReferralTab, SavedGuidesTab, WishlistTab } from "@/components/account/AccountExtras";
import type { PickupOption } from "@/components/checkout/PickupMeetupSection";

type Tab = "profile" | "orders" | "wishlist" | "guides" | "preferences" | "referral" | "payments" | "addresses";

export default function AccountView({ pickups }: { pickups: PickupOption[] }) {
  const { dict, locale } = useI18n();
  const { user, ready, login, register, signOut, refresh } = useAuth();
  const a = dict.account;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("profile");

  if (!ready) {
    return <div className="container-x py-20 text-muted">{dict.common.loading}</div>;
  }

  if (!user) {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErr(null);
      if (!email || !pwd || (mode === "signup" && !name)) {
        setErr(a.errorFields);
        return;
      }
      if (pwd.length < 8) {
        setErr(a.passwordMin);
        return;
      }
      const error =
        mode === "signup"
          ? await register({ email, password: pwd, name, phone, referralCode: referralCode || undefined })
          : await login(email, pwd);
      if (error) setErr(error);
    };
    return (
      <div className="container-x py-16">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto w-24 opacity-50">
              <SpiderGraphic hue={42} animate={false} />
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold text-cream">{mode === "signin" ? a.signIn : a.signUp}</h1>
            <p className="mt-2 text-sm text-bone">{a.signInToContinue}</p>
          </div>
          <form onSubmit={submit} className="card-glow space-y-4 rounded-2xl p-6">
            {mode === "signup" && (
              <>
                <label className="field">
                  <span>{dict.common.name}</span>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                </label>
                <label className="field">
                  <span>{dict.common.phone}</span>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="514-555-0142" />
                </label>
                <label className="field">
                  <span>{a.referralOptional}</span>
                  <input className="input" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="MSC-XXXXXX" />
                </label>
              </>
            )}
            <label className="field">
              <span>{dict.common.email}</span>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            <label className="field">
              <span>{dict.common.password}</span>
              <input type="password" className="input" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required />
            </label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button className="btn btn-gold w-full">{mode === "signin" ? a.signIn : a.signUp}</button>
          </form>
          <p className="mt-5 text-center text-sm text-bone">
            {mode === "signin" ? a.noAccount : a.haveAccount}{" "}
            <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(null); }} className="font-semibold text-gold-bright hover:underline">
              {mode === "signin" ? a.createOne : a.signIn}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: a.tabProfile },
    { id: "orders", label: a.tabOrders },
    { id: "wishlist", label: a.tabWishlist },
    { id: "guides", label: a.tabGuides },
    { id: "preferences", label: a.tabPreferences },
    { id: "referral", label: a.tabReferral },
    { id: "payments", label: a.tabPayments },
    { id: "addresses", label: a.tabAddresses },
  ];

  return (
    <div className="container-x py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{a.welcome}</p>
          <h1 className="font-display text-3xl font-bold text-cream">{user.name}</h1>
        </div>
        <button onClick={() => void signOut()} className="btn btn-ghost">{a.signOut}</button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-line">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`relative px-4 py-3 text-sm font-medium transition ${tab === tb.id ? "text-gold-bright" : "text-bone hover:text-cream"}`}
          >
            {tb.label}
            {tab === tb.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-gold" />}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab />}
      {tab === "orders" && <OrdersTab onRefresh={() => void refresh()} />}
      {tab === "wishlist" && (
        <div>
          <h2 className="mb-4 font-display text-xl font-bold text-cream">{a.wishlistTitle}</h2>
          <WishlistTab />
        </div>
      )}
      {tab === "guides" && (
        <div>
          <h2 className="mb-4 font-display text-xl font-bold text-cream">{a.guidesTitle}</h2>
          <SavedGuidesTab />
        </div>
      )}
      {tab === "preferences" && (
        <div>
          <h2 className="mb-4 font-display text-xl font-bold text-cream">{a.preferencesTitle}</h2>
          <PreferencesTab pickups={pickups} />
        </div>
      )}
      {tab === "referral" && <ReferralTab />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "addresses" && <AddressesTab />}
    </div>
  );
}

function ProfileTab() {
  const { dict } = useI18n();
  const { user, updateProfile } = useAuth();
  const a = dict.account;
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <div className="card-glow max-w-lg rounded-2xl p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-cream">{a.profileTitle}</h2>
      <div className="space-y-4">
        <label className="field">
          <span>{dict.common.name}</span>
          <input className="input" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        </label>
        <label className="field">
          <span>{dict.common.email}</span>
          <input className="input opacity-60" value={user?.email ?? ""} disabled />
        </label>
        <label className="field">
          <span>{dict.common.phone}</span>
          <input className="input" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} placeholder="514-555-0142" />
        </label>
        <button onClick={() => { void updateProfile({ name, phone }); setSaved(true); }} className="btn btn-gold">
          {dict.common.save}
        </button>
        {saved && <span className="ml-3 text-sm text-ok">✓</span>}
      </div>
      <p className="mt-6 text-sm text-bone">{a.tarantulAppNote}</p>
    </div>
  );
}

function OrdersTab({ onRefresh }: { onRefresh: () => void }) {
  const { dict, locale } = useI18n();
  const { user } = useAuth();
  const { add } = useCart();
  const a = dict.account;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const statusLabel = (s: string) =>
    s === "delivered" ? a.statusDelivered : s === "ready" ? a.statusReady : s === "cancelled" ? a.statusCancelled : a.statusProcessing;

  const reorder = (o: Order) => {
    for (const it of o.items) {
      if (!it.productId || !it.unitKey) continue;
      add(it.productId, it.unitKey, it.qty, {
        slug: "",
        scientific: it.name,
        common: { en: it.name, fr: it.name },
        hue: 36,
        accent: "#c9a24b",
        sizeLabel: it.size,
        price: it.price,
      });
    }
  };

  const sendMessage = async (orderNumber: string) => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/account/orders/${orderNumber}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      setMessage("");
      onRefresh();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-cream">{a.ordersTitle}</h2>
      {user?.orders.length === 0 ? (
        <p className="text-bone">{a.noOrders}</p>
      ) : (
        user?.orders.map((o) => (
          <div key={o.id} className="card-glow rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <button type="button" onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="font-display font-bold text-gold-bright hover:underline">
                {o.id}
              </button>
              <span className="text-sm text-muted">{formatDate(o.date, locale)}</span>
              <span className="badge">{statusLabel(o.status)}</span>
              <span className="font-semibold text-cream">{formatPrice(o.total, locale)}</span>
            </div>
            {o.statusDetail && <p className="mt-2 text-sm text-gold-deep">{o.statusDetail}</p>}
            <ul className="mt-3 space-y-1 text-sm text-bone">
              {o.items.map((it, i) => (
                <li key={i}>{it.qty}× {it.name} — <span className="text-muted">{it.size}</span></li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => reorder(o)} className="btn btn-ghost text-sm">{a.reorder}</button>
              <a href={`/api/account/orders/${o.id}/certificate?print=1`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-sm">
                {a.certificate}
              </a>
            </div>
            {expanded === o.id && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-sm font-medium text-cream">{a.orderMessages}</p>
                <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
                  {(o.messages ?? []).map((m) => (
                    <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.author === "staff" ? "bg-gold/10 text-cream" : "bg-ink-soft text-bone"}`}>
                      <span className="text-xs text-muted">{m.author === "staff" ? a.staffReply : a.you} · {formatDate(m.date, locale)}</span>
                      <p className="mt-1">{m.body}</p>
                    </div>
                  ))}
                  {(o.messages ?? []).length === 0 && <p className="text-xs text-muted">{a.noMessages}</p>}
                </div>
                <div className="flex gap-2">
                  <input className="input flex-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={a.messagePlaceholder} />
                  <button type="button" disabled={sending} onClick={() => void sendMessage(o.id)} className="btn btn-gold">{a.sendMessage}</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function PaymentsTab() {
  const { dict } = useI18n();
  const a = dict.account;
  return (
    <div className="card-glow max-w-lg rounded-2xl p-6">
      <h2 className="font-display text-xl font-bold text-cream">{a.paymentsTitle}</h2>
      <p className="mt-3 text-sm text-bone">{a.paymentsStripeNote}</p>
    </div>
  );
}

function AddressesTab() {
  const { dict } = useI18n();
  const { user, addAddress, removeAddress } = useAuth();
  const a = dict.account;
  const co = dict.checkout;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ label: "", line1: "", city: "", postal: "" });

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="font-display text-xl font-bold text-cream">{a.addressesTitle}</h2>
      {user?.addresses.length === 0 && <p className="text-bone">{a.noAddresses}</p>}
      {user?.addresses.map((ad) => (
        <div key={ad.id} className="card-glow flex items-center justify-between rounded-xl p-4">
          <div>
            <p className="text-cream">{ad.label} {ad.isDefault && <span className="badge ml-1">{a.defaultBadge}</span>}</p>
            <p className="text-xs text-muted">{ad.line1}, {ad.city} {ad.postal}</p>
          </div>
          <button onClick={() => void removeAddress(ad.id)} className="text-sm text-muted hover:text-danger">{dict.common.remove}</button>
        </div>
      ))}
      {open ? (
        <div className="card-glow space-y-3 rounded-xl p-4">
          <input className="input" placeholder={dict.common.name} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          <input className="input" placeholder={co.address} value={f.line1} onChange={(e) => setF({ ...f, line1: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder={co.city} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
            <input className="input" placeholder={co.postal} value={f.postal} onChange={(e) => setF({ ...f, postal: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-gold flex-1"
              onClick={() => {
                if (!f.line1) return;
                void addAddress({ label: f.label || "Home", line1: f.line1, city: f.city, postal: f.postal, isDefault: user?.addresses.length === 0 });
                setF({ label: "", line1: "", city: "", postal: "" });
                setOpen(false);
              }}
            >
              {dict.common.save}
            </button>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>{dict.common.cancel}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="btn btn-ghost">+ {a.addAddress}</button>
      )}
    </div>
  );
}
