"use client";

/* One-time hydration from localStorage must happen in an effect (localStorage
   is unavailable during SSR), so the set-state-in-effect rule is expected here. */
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { PRODUCTS } from "@/lib/products";
import type { L, Product, SizeOption } from "@/lib/types";

/** Display snapshot stored on each line so cart works even when the client
 *  does not hold the full (DB-backed) catalog. */
export interface CartSnapshot {
  slug: string;
  scientific: string;
  common: L;
  hue: number;
  accent: string;
  image?: string;
  sizeLabel: L;
  price: number;
}

export interface CartLine {
  productId: string;
  sizeId: string;
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
  id: string;
  label: L;
  price: number;
}

export interface ResolvedLine {
  productId: string;
  sizeId: string;
  qty: number;
  product: CartDisplayProduct;
  size: CartDisplaySize;
  lineTotal: number;
  key: string;
}

/** Build the snapshot stored on a cart line from a product + chosen size. */
export function snapshotFromProduct(product: Product, size: SizeOption): CartSnapshot {
  return {
    slug: product.slug,
    scientific: product.scientific,
    common: product.common,
    hue: product.hue,
    accent: product.accent,
    image: product.image,
    sizeLabel: size.label,
    price: size.price,
  };
}

interface CartCtx {
  lines: CartLine[];
  resolved: ResolvedLine[];
  count: number;
  subtotal: number;
  add: (productId: string, sizeId: string, qty?: number, snap?: CartSnapshot) => void;
  setQty: (productId: string, sizeId: string, qty: number) => void;
  remove: (productId: string, sizeId: string) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  lastAdded: string | null;
}

const STORAGE_KEY = "msc.cart.v1";
const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, hydrated]);

  const add = useCallback((productId: string, sizeId: string, qty = 1, snap?: CartSnapshot) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId && l.sizeId === sizeId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId && l.sizeId === sizeId ? { ...l, qty: l.qty + qty, snap: snap ?? l.snap } : l
        );
      }
      return [...prev, { productId, sizeId, qty, snap }];
    });
    setLastAdded(`${productId}:${sizeId}`);
    setOpen(true);
  }, []);

  const setQty = useCallback((productId: string, sizeId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => !(l.productId === productId && l.sizeId === sizeId))
        : prev.map((l) =>
            l.productId === productId && l.sizeId === sizeId ? { ...l, qty } : l
          )
    );
  }, []);

  const remove = useCallback((productId: string, sizeId: string) => {
    setLines((prev) => prev.filter((l) => !(l.productId === productId && l.sizeId === sizeId)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const resolved = useMemo<ResolvedLine[]>(() => {
    return lines
      .map((l): ResolvedLine | null => {
        if (l.snap) {
          return {
            productId: l.productId,
            sizeId: l.sizeId,
            qty: l.qty,
            product: {
              id: l.productId,
              slug: l.snap.slug,
              scientific: l.snap.scientific,
              common: l.snap.common,
              hue: l.snap.hue,
              accent: l.snap.accent,
              image: l.snap.image,
            },
            size: { id: l.sizeId, label: l.snap.sizeLabel, price: l.snap.price },
            lineTotal: l.snap.price * l.qty,
            key: `${l.productId}:${l.sizeId}`,
          };
        }
        // Legacy lines (saved before snapshots existed): resolve from the seed.
        const product = PRODUCTS.find((p) => p.id === l.productId);
        const size = product?.sizes.find((s) => s.id === l.sizeId);
        if (!product || !size) return null;
        return {
          productId: l.productId,
          sizeId: l.sizeId,
          qty: l.qty,
          product: {
            id: product.id,
            slug: product.slug,
            scientific: product.scientific,
            common: product.common,
            hue: product.hue,
            accent: product.accent,
            image: product.image,
          },
          size: { id: size.id, label: size.label, price: size.price },
          lineTotal: size.price * l.qty,
          key: `${l.productId}:${l.sizeId}`,
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
