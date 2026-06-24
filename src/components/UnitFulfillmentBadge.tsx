"use client";

import { useI18n } from "@/i18n/I18nProvider";
import {
  unitDistributorStock,
  unitHasDistributorStock,
  unitWarehouseStock,
} from "@/lib/unit-fulfillment";
import type { AvailableUnit } from "@/lib/types";

export default function UnitFulfillmentBadge({
  unit,
  distributorName,
  className = "",
}: {
  unit: AvailableUnit;
  distributorName?: string;
  className?: string;
}) {
  const { dict } = useI18n();

  if (!unitHasDistributorStock(unit)) return null;

  const store = distributorName?.trim() || dict.product.fulfillmentAtDistributor;
  const alsoAtStore = unitWarehouseStock(unit) > 0 && unitDistributorStock(unit) > 0;
  const template = alsoAtStore ? dict.product.fulfillmentAlsoAtStore : dict.product.fulfillmentAtStore;
  const label = template.replace("{store}", store);

  return (
    <span className={`block text-[10px] font-medium leading-tight text-ok ${className}`}>
      {label}
    </span>
  );
}
