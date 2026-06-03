// Demo CRM data powering the staff-only customer lookup tool.
// In production this would be backed by your real database / CRM.

export interface CustomerOrder {
  id: string;
  date: string;
  total: number;
  status: "processing" | "delivered" | "ready";
  items: string[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string; // canonical display format
  city: string;
  verified: boolean;
  orders: CustomerOrder[];
}

export const CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Élise Tremblay",
    email: "elise.t@example.com",
    phone: "514-555-0142",
    city: "Le Plateau-Mont-Royal",
    verified: true,
    orders: [
      { id: "MSC-1042", date: "2026-05-21", total: 138.0, status: "delivered", items: ["Chaco Golden Knee — Juvenile", "Care kit"] },
      { id: "MSC-1090", date: "2026-05-30", total: 74.75, status: "processing", items: ["Green Bottle Blue — Sling"] },
    ],
  },
  {
    id: "c2",
    name: "Marcus Lefebvre",
    email: "m.lefebvre@example.com",
    phone: "438-555-0193",
    city: "Verdun",
    verified: true,
    orders: [
      { id: "MSC-1011", date: "2026-04-12", total: 252.5, status: "delivered", items: ["Mexican Red Knee — Sub-adult"] },
      { id: "MSC-1067", date: "2026-05-26", total: 103.4, status: "ready", items: ["Gooty Sapphire — Sling"] },
    ],
  },
  {
    id: "c3",
    name: "Sofia Nguyen",
    email: "sofia.nguyen@example.com",
    phone: "514-555-0177",
    city: "Rosemont–La Petite-Patrie",
    verified: false,
    orders: [
      { id: "MSC-1085", date: "2026-05-28", total: 45.0, status: "processing", items: ["Curly Hair — Sling"] },
    ],
  },
  {
    id: "c4",
    name: "Liam O'Connor",
    email: "liam.oc@example.com",
    phone: "450-555-0128",
    city: "Longueuil",
    verified: true,
    orders: [
      { id: "MSC-0998", date: "2026-03-30", total: 320.0, status: "delivered", items: ["Burgundy Goliath — Juvenile", "Salmon Pink — Sling"] },
      { id: "MSC-1051", date: "2026-05-18", total: 66.7, status: "delivered", items: ["Venezuelan Suntiger — Sling"] },
      { id: "MSC-1093", date: "2026-06-01", total: 138.0, status: "ready", items: ["Socotra Blue Baboon — Sling"] },
    ],
  },
  {
    id: "c5",
    name: "Amélie Côté",
    email: "amelie.cote@example.com",
    phone: "514-555-0205",
    city: "Pointe-Claire",
    verified: true,
    orders: [
      { id: "MSC-1075", date: "2026-05-27", total: 92.0, status: "delivered", items: ["Antilles Pinktoe — Sling"] },
    ],
  },
  {
    id: "c6",
    name: "Daniel Rossi",
    email: "d.rossi@example.com",
    phone: "438-555-0250",
    city: "Laval",
    verified: false,
    orders: [
      { id: "MSC-1088", date: "2026-05-29", total: 50.0, status: "processing", items: ["Mexican Red Rump — Juvenile"] },
    ],
  },
];

/** Normalize a phone number to digits only for forgiving matching. */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function searchCustomersByPhone(query: string): Customer[] {
  const digits = normalizePhone(query);
  if (digits.length < 3) return [];
  return CUSTOMERS.filter((c) => normalizePhone(c.phone).includes(digits));
}

export function lifetimeValue(c: Customer): number {
  return c.orders.reduce((sum, o) => sum + o.total, 0);
}

export function lastOrderDate(c: Customer): string | null {
  if (c.orders.length === 0) return null;
  return c.orders
    .map((o) => o.date)
    .sort()
    .at(-1)!;
}
