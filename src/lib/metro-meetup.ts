import type { Locale } from "@/i18n/config";
import { t } from "@/lib/types";

export type PickupSubtype = "pickup_point" | "metro_meetup" | "custom_meetup";

export type MeetupAvailability =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "flexible";

export interface MeetupZone {
  id: string;
  name: { en: string; fr: string };
  fee: number;
  freeMeetupThreshold: number;
}

export interface MetroLine {
  id: string;
  name: { en: string; fr: string };
}

export interface MetroStation {
  id: string;
  name: string;
  lineId: string;
  zoneId: string;
  isTransferHub?: boolean;
}

export const MEETUP_ZONES: MeetupZone[] = [
  {
    id: "zone-1",
    name: { en: "Zone 1 — Central Montreal", fr: "Zone 1 — Montréal centre" },
    fee: 10,
    freeMeetupThreshold: 75,
  },
  {
    id: "zone-2",
    name: { en: "Zone 2 — Inner Montreal", fr: "Zone 2 — Montréal intérieur" },
    fee: 15,
    freeMeetupThreshold: 100,
  },
  {
    id: "zone-3",
    name: { en: "Zone 3 — Greater Island", fr: "Zone 3 — Grande île" },
    fee: 20,
    freeMeetupThreshold: 150,
  },
  {
    id: "zone-4",
    name: { en: "Zone 4 — Off-Island & Outer", fr: "Zone 4 — Hors île & périphérie" },
    fee: 20,
    freeMeetupThreshold: 180,
  },
];

export const METRO_LINES: MetroLine[] = [
  { id: "orange", name: { en: "Orange Line", fr: "Ligne orange" } },
  { id: "green", name: { en: "Green Line", fr: "Ligne verte" } },
  { id: "blue", name: { en: "Blue Line", fr: "Ligne bleue" } },
  { id: "yellow", name: { en: "Yellow Line", fr: "Ligne jaune" } },
];

export const METRO_STATIONS: MetroStation[] = [
  // Zone 1
  { id: "berri-uqam", name: "Berri-UQAM", lineId: "orange", zoneId: "zone-1", isTransferHub: true },
  { id: "berri-uqam-green", name: "Berri-UQAM", lineId: "green", zoneId: "zone-1", isTransferHub: true },
  { id: "mcgill", name: "McGill", lineId: "green", zoneId: "zone-1" },
  { id: "place-des-arts", name: "Place-des-Arts", lineId: "green", zoneId: "zone-1" },
  { id: "bonaventure", name: "Bonaventure", lineId: "orange", zoneId: "zone-1" },
  { id: "square-victoria", name: "Square-Victoria-OACI", lineId: "orange", zoneId: "zone-1" },
  { id: "lucien-lallier", name: "Lucien-L'Allier", lineId: "orange", zoneId: "zone-1", isTransferHub: true },
  // Zone 2
  { id: "jean-talon", name: "Jean-Talon", lineId: "orange", zoneId: "zone-2", isTransferHub: true },
  { id: "jean-talon-blue", name: "Jean-Talon", lineId: "blue", zoneId: "zone-2", isTransferHub: true },
  { id: "rosemont", name: "Rosemont", lineId: "orange", zoneId: "zone-2" },
  { id: "lionel-groulx", name: "Lionel-Groulx", lineId: "green", zoneId: "zone-2", isTransferHub: true },
  { id: "lionel-groulx-orange", name: "Lionel-Groulx", lineId: "orange", zoneId: "zone-2", isTransferHub: true },
  { id: "papineau", name: "Papineau", lineId: "green", zoneId: "zone-2" },
  { id: "frontenac", name: "Frontenac", lineId: "green", zoneId: "zone-2" },
  { id: "angrignon", name: "Angrignon", lineId: "green", zoneId: "zone-2" },
  // Zone 3
  { id: "cote-vertu", name: "Côte-Vertu", lineId: "orange", zoneId: "zone-3" },
  { id: "henri-bourassa", name: "Henri-Bourassa", lineId: "orange", zoneId: "zone-3" },
  { id: "snowdon", name: "Snowdon", lineId: "orange", zoneId: "zone-3", isTransferHub: true },
  { id: "snowdon-blue", name: "Snowdon", lineId: "blue", zoneId: "zone-3", isTransferHub: true },
  { id: "vendome", name: "Vendôme", lineId: "green", zoneId: "zone-3" },
  { id: "monk", name: "Monk", lineId: "green", zoneId: "zone-3" },
  { id: "honore-beaugrand", name: "Honoré-Beaugrand", lineId: "green", zoneId: "zone-3" },
  // Zone 4
  { id: "radisson", name: "Radisson", lineId: "yellow", zoneId: "zone-4" },
  { id: "longueuil", name: "Longueuil–Université-de-Sherbrooke", lineId: "yellow", zoneId: "zone-4" },
  { id: "jean-drapeau", name: "Jean-Drapeau", lineId: "yellow", zoneId: "zone-4" },
  { id: "de-la-concorde", name: "De la Concorde", lineId: "orange", zoneId: "zone-4" },
  { id: "montmorency", name: "Montmorency", lineId: "orange", zoneId: "zone-4" },
];

export const MEETUP_AVAILABILITY_OPTIONS: {
  id: MeetupAvailability;
  label: { en: string; fr: string };
}[] = [
  { id: "monday", label: { en: "Monday 9:30 AM–4:30 PM", fr: "Lundi 9 h 30 – 16 h 30" } },
  { id: "tuesday", label: { en: "Tuesday 9:30 AM–4:30 PM", fr: "Mardi 9 h 30 – 16 h 30" } },
  { id: "wednesday", label: { en: "Wednesday 9:30 AM–4:30 PM", fr: "Mercredi 9 h 30 – 16 h 30" } },
  { id: "thursday", label: { en: "Thursday 9:30 AM–4:30 PM", fr: "Jeudi 9 h 30 – 16 h 30" } },
  { id: "friday", label: { en: "Friday 9:30 AM–4:30 PM", fr: "Vendredi 9 h 30 – 16 h 30" } },
  { id: "saturday", label: { en: "Saturday 9:30 AM–4:30 PM", fr: "Samedi 9 h 30 – 16 h 30" } },
  { id: "flexible", label: { en: "Flexible within meetup hours", fr: "Flexible selon les heures de rencontre" } },
];

export function getMeetupZone(zoneId: string): MeetupZone | undefined {
  return MEETUP_ZONES.find((z) => z.id === zoneId);
}

export function getMetroStation(stationId: string): MetroStation | undefined {
  return METRO_STATIONS.find((s) => s.id === stationId);
}

export function getMetroLine(lineId: string): MetroLine | undefined {
  return METRO_LINES.find((l) => l.id === lineId);
}

export function getStationsForZone(zoneId: string): MetroStation[] {
  return METRO_STATIONS.filter((s) => s.zoneId === zoneId);
}

export function getLinesForZone(zoneId: string): MetroLine[] {
  const lineIds = new Set(getStationsForZone(zoneId).map((s) => s.lineId));
  return METRO_LINES.filter((l) => lineIds.has(l.id));
}

export function getStationsForZoneAndLine(zoneId: string, lineId: string): MetroStation[] {
  return METRO_STATIONS.filter((s) => s.zoneId === zoneId && s.lineId === lineId);
}

export function calcMeetupFee(subtotal: number, zone: MeetupZone): number {
  return subtotal >= zone.freeMeetupThreshold ? 0 : zone.fee;
}

export function stationFee(stationId: string, subtotal: number): number {
  const station = getMetroStation(stationId);
  if (!station) return 0;
  const zone = getMeetupZone(station.zoneId);
  if (!zone) return 0;
  return calcMeetupFee(subtotal, zone);
}

export function meetupAvailabilityLabel(id: MeetupAvailability, locale: Locale): string {
  const opt = MEETUP_AVAILABILITY_OPTIONS.find((o) => o.id === id);
  return opt ? t(opt.label, locale) : id;
}

export function stationDisplayName(station: MetroStation, locale: Locale): string {
  const line = getMetroLine(station.lineId);
  const hub = station.isTransferHub ? (locale === "fr" ? " (correspondance)" : " (transfer hub)") : "";
  return `${station.name}${hub}${line ? ` — ${t(line.name, locale)}` : ""}`;
}
