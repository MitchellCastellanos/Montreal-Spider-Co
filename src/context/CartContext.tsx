"use client";

/* One-time hydration from localStorage must happen in an effect (localStorage
   is unavailable during SSR), so the set-state-in-effect rule is expected here. */
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { PRODUCTS } from "@/lib/products";
import type { Product, SizeOption } from "@/lib/types";

export interface CartLine {
  productId: string;
  sizeId: string;
  qty: number;
}

export interface ResolvedLine extends CartLine {
  product: Product;
  size: SizeOption;
  lineTotal: number;
  key: string;
}

interface CartCtx {
  lines: CartLine[];
  resolved: ResolvedLine[];
  count: number;
  subtotal: number;
  add: (productId: string, sizeId: string, qty?: number) => void;
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

  const add = useCallback((productId: string, sizeId: string, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId && l.sizeId === sizeId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId && l.sizeId === sizeId ? { ...l, qty: l.qty + qty } : l
        );
      }
      return [...prev, { productId, sizeId, qty }];
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
      .map((l) => {
        const product = PRODUCTS.find((p) => p.id === l.productId);
        const size = product?.sizes.find((s) => s.id === l.sizeId);
        if (!product || !size) return null;
        return {
          ...l,
          product,
          size,
          lineTotal: size.price * l.qty,
          key: `${l.productId}:${l.sizeId}`,
        };
      })
      .filter(Boolean) as ResolvedLine[];
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
