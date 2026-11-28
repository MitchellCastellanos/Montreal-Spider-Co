"use client";

import { useI18n } from "@/i18n/I18nProvider";
import {
  unitDistributorStock,
  unitHasDistributorStock,
  unitWarehouseStock,
} from "@/lib/unit-fulfillment";
import { isExternalUnit, type AvailableUnit } from "@/lib/types";

export default function UnitFulfillmentBadge({
  unit,
  distributorName,
  className = "",
  showInStock = false,
}: {
  unit: AvailableUnit;
  distributorName?: string;
  className?: string;
  /** Label own-inventory units "In stock" (used when the product also has made-to-order units). */
  showInStock?: boolean;
}) {
  const { dict } = useI18n();

  if (isExternalUnit(unit)) {
    const lead = unit.leadDays
      ? dict.product.leadTimeAfterConfirm.replace("{min}", String(unit.leadDays.min)).replace("{max}", String(unit.leadDays.max))
      : "";
    return (
      <span className={`block text-[10px] font-medium leading-tight text-gold-deep ${className}`}>
        {dict.product.availableToOrder}
        {lead && <span className="block font-normal text-muted">{lead}</span>}
      </span>
    );
  }

  if (!unitHasDistributorStock(unit)) {
    return showInStock ? (
      <span className={`block text-[10px] font-medium leading-tight text-ok ${className}`}>{dict.common.inStock}</span>
    ) : null;
  }

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
