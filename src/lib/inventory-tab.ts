export type InventoryTab = "list" | "receive" | "transfer" | "sell" | "writeoff";

const INVENTORY_TABS: InventoryTab[] = ["list", "receive", "transfer", "sell", "writeoff"];

export function parseInventoryTab(tab?: string): InventoryTab {
  return INVENTORY_TABS.includes(tab as InventoryTab) ? (tab as InventoryTab) : "list";
}
