import type { AvailableUnit } from "./types";

/** Warehouse count for a buy-box (seed catalog treats all stock as warehouse). */
export function unitWarehouseStock(unit: AvailableUnit): number {
  if (unit.warehouseStock !== undefined || unit.distributorStock !== undefined) {
    return unit.warehouseStock ?? 0;
  }
  return unit.stock;
}

export function unitDistributorStock(unit: AvailableUnit): number {
  return unit.distributorStock ?? 0;
}

export function unitHasDistributorStock(unit: AvailableUnit): boolean {
  return unit.stock > 0 && unitDistributorStock(unit) > 0;
}

export function unitIsDistributorOnly(unit: AvailableUnit): boolean {
  return unit.stock > 0 && unitWarehouseStock(unit) === 0 && unitDistributorStock(unit) > 0;
}

export function unitHasWarehouseStock(unit: AvailableUnit): boolean {
  return unit.stock > 0 && unitWarehouseStock(unit) > 0;
}
