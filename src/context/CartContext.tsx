"use client";

/* One-time hydration from localStorage must happen in an effect (localStorage
   is unavailable during SSR), so the set-state-in-effect rule is expected here. */
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { PRODUCTS } from "@/lib/products";
import { asL, type AvailableUnit, type L, type Product } from "@/lib/types";

/** Display snapshot stored on each line so cart works even when the client
 *  does not hold the full (DB-backed) catalog. */
export interface CartSnapshot {
  slug: string;
  scientific: string;
  common: L;
  hue: number;
  accent: string;
  image?: string;
  sizeLabel: string;
  price: number;
}

export interface CartLine {
  productId: string;
  /** AvailableUnit.key — the (sizeCm, sex, price) buy-box signature. */
  unitKey: string;
  qty: number;
  snap?: CartSnapshot;
}

export interface CartDisplayProduct {
  id: string;
  slug: string;
  scientific: string;
  common: L;
  hue: number;
  accent: string;
  image?: string;
}

export interface CartDisplaySize {
  key: string;
  label: string;
  price: number;
}

export interface ResolvedLine {
  productId: string;
  unitKey: string;
  qty: number;
  product: CartDisplayProduct;
  size: CartDisplaySize;
  lineTotal: number;
  key: string;
}

/** Build the snapshot stored on a cart line from a product + chosen buy-box. */
export function snapshotFromProduct(product: Product, unit: AvailableUnit): CartSnapshot {
  return {
    slug: product.slug,
    scientific: product.scientific,
    common: asL(product.common),
    hue: product.hue,
    accent: product.accent,
    image: product.image,
    sizeLabel: unit.sizeLabel,
    price: unit.price,
  };
}

interface CartCtx {
  lines: CartLine[];
  resolved: ResolvedLine[];
  count: number;
  subtotal: number;
  add: (productId: string, unitKey: string, qty?: number, snap?: CartSnapshot) => void;
  setQty: (productId: string, unitKey: string, qty: number) => void;
  remove: (productId: string, unitKey: string) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  lastAdded: string | null;
}

const STORAGE_KEY = "msc.cart.v1";
const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mergedForUser = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setLines(
            parsed.map((line) => {
              if (!line || typeof line !== "object") return null;
              const l = line as CartLine;
              if (!l.snap) return l;
              return {
                ...l,
                snap: {
                  ...l.snap,
                  common: asL(l.snap.common),
                  sizeLabel: typeof l.snap.sizeLabel === "string" ? l.snap.sizeLabel : String(l.snap.sizeLabel ?? ""),
                },
              };
            }).filter((l): l is CartLine => l !== null),
          );
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !authReady || !user) return;
    if (mergedForUser.current === user.id) return;
    mergedForUser.current = user.id;

    void (async () => {
      try {
        const res = await fetch("/api/account/cart", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { lines?: CartLine[] };
        const serverLines = Array.isArray(data.lines) ? data.lines : [];
        setLines((local) => {
          const merged = [...local];
          for (const sl of serverLines) {
            const idx = merged.findIndex((l) => l.productId === sl.productId && l.unitKey === sl.unitKey);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], qty: merged[idx].qty + sl.qty, snap: merged[idx].snap ?? sl.snap };
            } else {
              merged.push(sl);
            }
          }
          return merged;
        });
      } catch {
        /* ignore */
      }
    })();
  }, [hydrated, authReady, user]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
    if (!user) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void fetch("/api/account/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
    }, 600);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [lines, hydrated, user]);

  useEffect(() => {
    if (!user) mergedForUser.current = null;
  }, [user]);

  const add = useCallback((productId: string, unitKey: string, qty = 1, snap?: CartSnapshot) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId && l.unitKey === unitKey);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId && l.unitKey === unitKey ? { ...l, qty: l.qty + qty, snap: snap ?? l.snap } : l
        );
      }
      return [...prev, { productId, unitKey, qty, snap }];
    });
    setLastAdded(`${productId}:${unitKey}`);
    setOpen(true);
  }, []);

  const setQty = useCallback((productId: string, unitKey: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => !(l.productId === productId && l.unitKey === unitKey))
        : prev.map((l) =>
            l.productId === productId && l.unitKey === unitKey ? { ...l, qty } : l
          )
    );
  }, []);

  const remove = useCallback((productId: string, unitKey: string) => {
    setLines((prev) => prev.filter((l) => !(l.productId === productId && l.unitKey === unitKey)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const resolved = useMemo<ResolvedLine[]>(() => {
    return lines
      .map((l): ResolvedLine | null => {
        if (l.snap) {
          return {
            productId: l.productId,
            unitKey: l.unitKey,
            qty: l.qty,
            product: {
              id: l.productId,
              slug: l.snap.slug,
              scientific: l.snap.scientific,
              common: asL(l.snap.common),
              hue: l.snap.hue,
              accent: l.snap.accent,
              image: l.snap.image,
            },
            size: { key: l.unitKey, label: l.snap.sizeLabel, price: l.snap.price },
            lineTotal: l.snap.price * l.qty,
            key: `${l.productId}:${l.unitKey}`,
          };
        }
        // Legacy lines (saved before snapshots existed): resolve from the seed.
        const product = PRODUCTS.find((p) => p.id === l.productId);
        const unit = product?.availability.find((u) => u.key === l.unitKey);
        if (!product || !unit) return null;
        return {
          productId: l.productId,
          unitKey: l.unitKey,
          qty: l.qty,
          product: {
            id: product.id,
            slug: product.slug,
            scientific: product.scientific,
            common: asL(product.common),
            hue: product.hue,
            accent: product.accent,
            image: product.image,
          },
          size: { key: unit.key, label: unit.sizeLabel, price: unit.price },
          lineTotal: unit.price * l.qty,
          key: `${l.productId}:${l.unitKey}`,
        };
      })
      .filter((l): l is ResolvedLine => l !== null);
  }, [lines]);

  const count = useMemo(() => resolved.reduce((n, l) => n + l.qty, 0), [resolved]);
  const subtotal = useMemo(() => resolved.reduce((n, l) => n + l.lineTotal, 0), [resolved]);

  const value: CartCtx = {
    lines,
    resolved,
    count,
    subtotal,
    add,
    setQty,
    remove,
    clear,
    isOpen,
    openCart: () => setOpen(true),
    closeCart: () => setOpen(false),
    lastAdded,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
