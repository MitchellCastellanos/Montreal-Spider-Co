import type { WeeklyHours } from "./opening-hours";
import { sameHours } from "./opening-hours";

export interface StoreLocationSeed {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  hours: WeeklyHours;
  mapsUrl?: string;
  phone?: string;
  isPickup: boolean;
  isDistributor: boolean;
}

export interface DeliveryZone {
  id: string;
  name: { en: string; fr: string };
  fee: number;
  eta: { en: string; fr: string };
}

/** @deprecated Use StoreLocationSeed — kept for seed compat */
export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  hours: WeeklyHours;
  mapsUrl?: string;
  phone?: string;
}

export const STORE_LOCATIONS: StoreLocationSeed[] = [
  {
    id: "plateau",
    name: "The Plateau Hub",
    address: "Avenue du Mont-Royal E, Le Plateau-Mont-Royal",
    neighborhood: "Le Plateau-Mont-Royal",
    hours: sameHours(["tue", "wed", "thu", "fri", "sat", "sun"], "12:00", "19:00"),
    isPickup: true,
    isDistributor: false,
  },
  {
    id: "rosemont",
    name: "Rosemont Pickup",
    address: "Boulevard Saint-Laurent, Rosemont–La Petite-Patrie",
    neighborhood: "Rosemont–La Petite-Patrie",
    hours: sameHours(["wed", "thu", "fri", "sat"], "11:00", "18:00"),
    isPickup: true,
    isDistributor: false,
  },
  {
    id: "verdun",
    name: "Verdun Point",
    address: "Rue Wellington, Verdun",
    neighborhood: "Verdun",
    hours: sameHours(["thu", "fri", "sat", "sun"], "12:00", "18:00"),
    isPickup: true,
    isDistributor: false,
  },
  {
    id: "westisland",
    name: "West Island Depot",
    address: "Boulevard Saint-Jean, Pointe-Claire",
    neighborhood: "Pointe-Claire",
    hours: sameHours(["sat", "sun"], "11:00", "16:00"),
    isPickup: true,
    isDistributor: false,
  },
  {
    id: "longueuil",
    name: "Longueuil Counter",
    address: "Rue Saint-Charles O, Longueuil",
    neighborhood: "Longueuil",
    hours: sameHours(["fri", "sat", "sun"], "12:00", "18:00"),
    isPickup: true,
    isDistributor: false,
  },
  {
    id: "laval",
    name: "Laval Pickup",
    address: "Boulevard Saint-Martin O, Laval",
    neighborhood: "Laval",
    hours: sameHours(["sat", "sun"], "12:00", "17:00"),
    isPickup: true,
    isDistributor: false,
  },
  {
    id: "exotik-mtl",
    name: "Exotik Montréal",
    address: "Rue Saint-Denis, Le Plateau-Mont-Royal",
    neighborhood: "Le Plateau-Mont-Royal",
    hours: sameHours(["tue", "wed", "thu", "fri", "sat"], "11:00", "19:00"),
    phone: "514-555-0198",
    isPickup: false,
    isDistributor: true,
  },
  {
    id: "reptile-laval",
    name: "Reptile Laval",
    address: "Boulevard Curé-Labelle, Laval",
    neighborhood: "Laval",
    hours: sameHours(["wed", "thu", "fri", "sat", "sun"], "10:00", "18:00"),
    phone: "450-555-0144",
    isPickup: false,
    isDistributor: true,
  },
  {
    id: "south-shore-pets",
    name: "South Shore Exotics",
    address: "Chemin de Chambly, Longueuil",
    neighborhood: "Longueuil",
    hours: sameHours(["thu", "fri", "sat"], "12:00", "18:00"),
    phone: "450-555-0177",
    isPickup: false,
    isDistributor: true,
  },
];

/** Pickup-only subset for legacy seed references. */
export const PICKUP_POINTS: PickupPoint[] = STORE_LOCATIONS.filter((l) => l.isPickup);

/** Distributor-only subset for legacy seed references. */
export const AUTHORIZED_DISTRIBUTORS: PickupPoint[] = STORE_LOCATIONS.filter((l) => l.isDistributor);

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
