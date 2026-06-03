import type { L } from "./types";

export interface PickupPoint {
  id: string;
  name: string;
  address: L;
  neighborhood: string;
  hours: L;
}

export interface DeliveryZone {
  id: string;
  name: L;
  fee: number;
  eta: L;
}

export const PICKUP_POINTS: PickupPoint[] = [
  {
    id: "plateau",
    name: "The Plateau Hub",
    address: { en: "Avenue du Mont-Royal E, Le Plateau-Mont-Royal", fr: "Avenue du Mont-Royal E, Le Plateau-Mont-Royal" },
    neighborhood: "Le Plateau-Mont-Royal",
    hours: { en: "Tue–Sun, 12:00–19:00", fr: "Mar–Dim, 12h00–19h00" },
  },
  {
    id: "rosemont",
    name: "Rosemont Pickup",
    address: { en: "Boulevard Saint-Laurent, Rosemont–La Petite-Patrie", fr: "Boulevard Saint-Laurent, Rosemont–La Petite-Patrie" },
    neighborhood: "Rosemont–La Petite-Patrie",
    hours: { en: "Wed–Sat, 11:00–18:00", fr: "Mer–Sam, 11h00–18h00" },
  },
  {
    id: "verdun",
    name: "Verdun Point",
    address: { en: "Rue Wellington, Verdun", fr: "Rue Wellington, Verdun" },
    neighborhood: "Verdun",
    hours: { en: "Thu–Sun, 12:00–18:00", fr: "Jeu–Dim, 12h00–18h00" },
  },
  {
    id: "westisland",
    name: "West Island Depot",
    address: { en: "Boulevard Saint-Jean, Pointe-Claire", fr: "Boulevard Saint-Jean, Pointe-Claire" },
    neighborhood: "Pointe-Claire",
    hours: { en: "Sat–Sun, 11:00–16:00", fr: "Sam–Dim, 11h00–16h00" },
  },
  {
    id: "longueuil",
    name: "Longueuil Counter",
    address: { en: "Rue Saint-Charles O, Longueuil", fr: "Rue Saint-Charles O, Longueuil" },
    neighborhood: "Longueuil",
    hours: { en: "Fri–Sun, 12:00–18:00", fr: "Ven–Dim, 12h00–18h00" },
  },
  {
    id: "laval",
    name: "Laval Pickup",
    address: { en: "Boulevard Saint-Martin O, Laval", fr: "Boulevard Saint-Martin O, Laval" },
    neighborhood: "Laval",
    hours: { en: "Sat–Sun, 12:00–17:00", fr: "Sam–Dim, 12h00–17h00" },
  },
];

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "central",
    name: { en: "Central Montreal", fr: "Montréal centre" },
    fee: 9,
    eta: { en: "1–2 days", fr: "1–2 jours" },
  },
  {
    id: "island",
    name: { en: "Greater Island of Montreal", fr: "Île de Montréal (élargie)" },
    fee: 14,
    eta: { en: "2–3 days", fr: "2–3 jours" },
  },
  {
    id: "offisland",
    name: { en: "Laval · Longueuil · South Shore", fr: "Laval · Longueuil · Rive-Sud" },
    fee: 19,
    eta: { en: "2–4 days", fr: "2–4 jours" },
  },
  {
    id: "surrounding",
    name: { en: "Surrounding areas (within 60 km)", fr: "Environs (rayon de 60 km)" },
    fee: 29,
    eta: { en: "3–5 days", fr: "3–5 jours" },
  },
];

export const FREE_DELIVERY_THRESHOLD = 250;
