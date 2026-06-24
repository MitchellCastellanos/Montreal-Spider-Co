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

export type MetroMeetupAreaId = "southwest" | "central" | "north-east" | "laval-south-shore";

export type MetroLineId = "green" | "orange" | "blue" | "yellow";

/** @deprecated Use MetroMeetupAreaId — kept for order DB / preferences compatibility */
export type MeetupZone = MeetupArea;

export interface MeetupArea {
  id: MetroMeetupAreaId;
  name: { en: string; fr: string };
  fee: number;
  freeMeetupThreshold: number;
}

export interface MetroLine {
  id: MetroLineId;
  name: { en: string; fr: string };
  color: string;
}

export interface MetroStation {
  id: string;
  name: string;
  line: MetroLineId;
  area: MetroMeetupAreaId;
  fee: number;
  freeMeetupThreshold: number;
  isTransferHub?: boolean;
  x: number;
  y: number;
}

export const MEETUP_AREAS: MeetupArea[] = [
  {
    id: "southwest",
    name: { en: "Southwest Montreal", fr: "Montréal sud-ouest" },
    fee: 12,
    freeMeetupThreshold: 75,
  },
  {
    id: "central",
    name: { en: "Central Montreal", fr: "Montréal centre" },
    fee: 15,
    freeMeetupThreshold: 125,
  },
  {
    id: "north-east",
    name: { en: "North & East Montreal", fr: "Montréal nord et est" },
    fee: 20,
    freeMeetupThreshold: 150,
  },
  {
    id: "laval-south-shore",
    name: { en: "Laval & South Shore", fr: "Laval et Rive-Sud" },
    fee: 25,
    freeMeetupThreshold: 200,
  },
];

/** Alias — checkout and delivery page import MEETUP_ZONES */
export const MEETUP_ZONES = MEETUP_AREAS;

export const METRO_LINES: MetroLine[] = [
  { id: "orange", name: { en: "Orange Line", fr: "Ligne orange" }, color: "#F7941D" },
  { id: "green", name: { en: "Green Line", fr: "Ligne verte" }, color: "#00A651" },
  { id: "blue", name: { en: "Blue Line", fr: "Ligne bleue" }, color: "#009EE0" },
  { id: "yellow", name: { en: "Yellow Line", fr: "Ligne jaune" }, color: "#FFD200" },
];

/** Schematic SVG track segments (viewBox 0 0 520 480) */
export const METRO_LINE_PATHS: { line: MetroLineId; d: string }[] = [
  {
    line: "orange",
    d: "M 300 35 L 300 175 L 300 255 L 280 335 M 300 130 L 130 130",
  },
  { line: "green", d: "M 470 215 L 300 215 L 200 275 L 155 385" },
  { line: "blue", d: "M 175 200 L 300 130" },
  { line: "yellow", d: "M 300 255 L 300 445" },
];

const AREA_LOOKUP = Object.fromEntries(MEETUP_AREAS.map((a) => [a.id, a])) as Record<
  MetroMeetupAreaId,
  MeetupArea
>;

function station(
  id: string,
  name: string,
  line: MetroLineId,
  area: MetroMeetupAreaId,
  x: number,
  y: number,
  isTransferHub?: boolean,
): MetroStation {
  const a = AREA_LOOKUP[area];
  return {
    id,
    name,
    line,
    area,
    fee: a.fee,
    freeMeetupThreshold: a.freeMeetupThreshold,
    isTransferHub,
    x,
    y,
  };
}

export const METRO_STATIONS: MetroStation[] = [
  // Southwest — near Lachine / NDG / Lasalle
  station("lionel-groulx-green", "Lionel-Groulx", "green", "southwest", 200, 275, true),
  station("lionel-groulx-orange", "Lionel-Groulx", "orange", "southwest", 200, 275, true),
  station("vendome", "Vendôme", "green", "southwest", 160, 260),
  station("monk", "Monk", "green", "southwest", 140, 300),
  station("angrignon", "Angrignon", "green", "southwest", 155, 385),
  station("lucien-lallier", "Lucien-L'Allier", "orange", "southwest", 280, 335, true),

  // Central — downtown core
  station("berri-uqam-orange", "Berri-UQAM", "orange", "central", 300, 215, true),
  station("berri-uqam-green", "Berri-UQAM", "green", "central", 300, 215, true),
  station("mcgill", "McGill", "green", "central", 260, 215),
  station("place-des-arts", "Place-des-Arts", "green", "central", 240, 215),
  station("bonaventure", "Bonaventure", "orange", "central", 300, 255),
  station("square-victoria", "Square-Victoria-OACI", "orange", "central", 280, 295),

  // North & East
  station("jean-talon-orange", "Jean-Talon", "orange", "north-east", 300, 130, true),
  station("jean-talon-blue", "Jean-Talon", "blue", "north-east", 300, 130, true),
  station("rosemont", "Rosemont", "orange", "north-east", 300, 175),
  station("papineau", "Papineau", "green", "north-east", 380, 215),
  station("frontenac", "Frontenac", "green", "north-east", 420, 215),
  station("honore-beaugrand", "Honoré-Beaugrand", "green", "north-east", 470, 215),
  station("henri-bourassa", "Henri-Bourassa", "orange", "north-east", 300, 85),
  station("cote-vertu", "Côte-Vertu", "orange", "north-east", 130, 130),
  station("snowdon-orange", "Snowdon", "orange", "north-east", 175, 200, true),
  station("snowdon-blue", "Snowdon", "blue", "north-east", 175, 200, true),

  // Laval & South Shore
  station("montmorency", "Montmorency", "orange", "laval-south-shore", 300, 35),
  station("de-la-concorde", "De la Concorde", "orange", "laval-south-shore", 280, 55),
  station("longueuil", "Longueuil–Université-de-Sherbrooke", "yellow", "laval-south-shore", 300, 405),
  station("jean-drapeau", "Jean-Drapeau", "yellow", "laval-south-shore", 300, 365),
  station("radisson", "Radisson", "yellow", "laval-south-shore", 300, 445),
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

export const METRO_MAP_VIEWBOX = { width: 520, height: 480 };

export function getMeetupArea(areaId: string): MeetupArea | undefined {
  return MEETUP_AREAS.find((a) => a.id === areaId);
}

/** @deprecated Use getMeetupArea */
export function getMeetupZone(zoneId: string): MeetupArea | undefined {
  return getMeetupArea(zoneId);
}

export function getMetroStation(stationId: string): MetroStation | undefined {
  return METRO_STATIONS.find((s) => s.id === stationId);
}

export function getMetroLine(lineId: string): MetroLine | undefined {
  return METRO_LINES.find((l) => l.id === lineId);
}

export function getStationsForArea(areaId: string): MetroStation[] {
  return METRO_STATIONS.filter((s) => s.area === areaId);
}

/** @deprecated Use getStationsForArea */
export function getStationsForZone(zoneId: string): MetroStation[] {
  return getStationsForArea(zoneId);
}

export function getLinesForArea(areaId: string): MetroLine[] {
  const lineIds = new Set(getStationsForArea(areaId).map((s) => s.line));
  return METRO_LINES.filter((l) => lineIds.has(l.id));
}

/** @deprecated Use getLinesForArea */
export function getLinesForZone(zoneId: string): MetroLine[] {
  return getLinesForArea(zoneId);
}

export function getStationsForAreaAndLine(areaId: string, lineId: string): MetroStation[] {
  return METRO_STATIONS.filter((s) => s.area === areaId && s.line === lineId);
}

/** @deprecated Use getStationsForAreaAndLine */
export function getStationsForZoneAndLine(zoneId: string, lineId: string): MetroStation[] {
  return getStationsForAreaAndLine(zoneId, lineId);
}

export function calcMeetupFee(subtotal: number, area: Pick<MeetupArea, "fee" | "freeMeetupThreshold">): number {
  return subtotal >= area.freeMeetupThreshold ? 0 : area.fee;
}

export function calcStationMeetupFee(subtotal: number, station: Pick<MetroStation, "fee" | "freeMeetupThreshold">): number {
  return calcMeetupFee(subtotal, station);
}

export function stationFee(stationId: string, subtotal: number): number {
  const s = getMetroStation(stationId);
  if (!s) return 0;
  return calcStationMeetupFee(subtotal, s);
}

export function meetupAvailabilityLabel(id: MeetupAvailability, locale: Locale): string {
  const opt = MEETUP_AVAILABILITY_OPTIONS.find((o) => o.id === id);
  return opt ? t(opt.label, locale) : id;
}

export function stationDisplayName(station: MetroStation, locale: Locale): string {
  const line = getMetroLine(station.line);
  const hub = station.isTransferHub ? (locale === "fr" ? " (correspondance)" : " (transfer hub)") : "";
  return `${station.name}${hub}${line ? ` — ${t(line.name, locale)}` : ""}`;
}

/** Unique physical station names for map rendering (one dot per location). */
export function getMapStationGroups(): { key: string; name: string; x: number; y: number; stations: MetroStation[] }[] {
  const groups = new Map<string, { key: string; name: string; x: number; y: number; stations: MetroStation[] }>();
  for (const s of METRO_STATIONS) {
    const key = `${s.name}:${s.x}:${s.y}`;
    const existing = groups.get(key);
    if (existing) {
      existing.stations.push(s);
    } else {
      groups.set(key, { key, name: s.name, x: s.x, y: s.y, stations: [s] });
    }
  }
  return [...groups.values()];
}
