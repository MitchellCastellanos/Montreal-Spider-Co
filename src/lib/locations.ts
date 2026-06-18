import type { WeeklyHours } from "./opening-hours";
import { sameHours } from "./opening-hours";

export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  hours: WeeklyHours;
  mapsUrl?: string;
  phone?: string;
}

export interface DeliveryZone {
  id: string;
  name: { en: string; fr: string };
  fee: number;
  eta: { en: string; fr: string };
}

export const PICKUP_POINTS: PickupPoint[] = [
  {
    id: "plateau",
    name: "The Plateau Hub",
    address: "Avenue du Mont-Royal E, Le Plateau-Mont-Royal",
    neighborhood: "Le Plateau-Mont-Royal",
    hours: sameHours(["tue", "wed", "thu", "fri", "sat", "sun"], "12:00", "19:00"),
  },
  {
    id: "rosemont",
    name: "Rosemont Pickup",
    address: "Boulevard Saint-Laurent, Rosemont–La Petite-Patrie",
    neighborhood: "Rosemont–La Petite-Patrie",
    hours: sameHours(["wed", "thu", "fri", "sat"], "11:00", "18:00"),
  },
  {
    id: "verdun",
    name: "Verdun Point",
    address: "Rue Wellington, Verdun",
    neighborhood: "Verdun",
    hours: sameHours(["thu", "fri", "sat", "sun"], "12:00", "18:00"),
  },
  {
    id: "westisland",
    name: "West Island Depot",
    address: "Boulevard Saint-Jean, Pointe-Claire",
    neighborhood: "Pointe-Claire",
    hours: sameHours(["sat", "sun"], "11:00", "16:00"),
  },
  {
    id: "longueuil",
    name: "Longueuil Counter",
    address: "Rue Saint-Charles O, Longueuil",
    neighborhood: "Longueuil",
    hours: sameHours(["fri", "sat", "sun"], "12:00", "18:00"),
  },
  {
    id: "laval",
    name: "Laval Pickup",
    address: "Boulevard Saint-Martin O, Laval",
    neighborhood: "Laval",
    hours: sameHours(["sat", "sun"], "12:00", "17:00"),
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
