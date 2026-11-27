"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product } from "@/lib/types";

type Ctx = { unitKey: string; setUnitKey: (k: string) => void };
const SelectionContext = createContext<Ctx | null>(null);

function defaultKey(product: Product): string {
  const available = product.availability.filter((s) => s.stock > 0);
  return available[0]?.key ?? product.availability[0]?.key ?? "";
}

/** Shares the selected size/sex between the product photo and the buy box. */
export function ProductSelectionProvider({ product, children }: { product: Product; children: ReactNode }) {
  const [unitKey, setUnitKey] = useState(() => defaultKey(product));
  return <SelectionContext.Provider value={{ unitKey, setUnitKey }}>{children}</SelectionContext.Provider>;
}

/** Selected unit key: shared when inside a provider, local otherwise (e.g. quick-add widgets). */
export function useSelectedUnitKey(product: Product): [string, (k: string) => void] {
  const ctx = useContext(SelectionContext);
  const [local, setLocal] = useState(() => defaultKey(product));
  return ctx ? [ctx.unitKey, ctx.setUnitKey] : [local, setLocal];
}
