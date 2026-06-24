import type { Locale } from "@/i18n/config";
import { t } from "@/lib/types";

export {
  METRO_MAP_VIEWBOX,
  METRO_LINE_PATHS,
  METRO_MAP_LANDMASS,
  METRO_MAP_ZONE_LABELS,
} from "@/lib/metro-map-schematic";

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
  { id: "orange", name: { en: "Orange Line", fr: "Ligne orange" }, color: "#F58220" },
  { id: "green", name: { en: "Green Line", fr: "Ligne verte" }, color: "#008B45" },
  { id: "blue", name: { en: "Blue Line", fr: "Ligne bleue" }, color: "#005596" },
  { id: "yellow", name: { en: "Yellow Line", fr: "Ligne jaune" }, color: "#FFD100" },
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
  // Southwest
  station("lionel-groulx-green", "Lionel-Groulx", "green", "southwest", 238, 248, true),
  station("lionel-groulx-orange", "Lionel-Groulx", "orange", "southwest", 238, 248, true),
  station("vendome", "Vendôme", "green", "southwest", 198, 272),
  station("monk", "Monk", "green", "southwest", 172, 308),
  station("angrignon", "Angrignon", "green", "southwest", 152, 362),
  station("lucien-lallier", "Lucien-L'Allier", "orange", "southwest", 288, 328, true),

  // Central
  station("berri-uqam-orange", "Berri-UQAM", "orange", "central", 380, 248, true),
  station("berri-uqam-green", "Berri-UQAM", "green", "central", 380, 248, true),
  station("mcgill", "McGill", "green", "central", 350, 248),
  station("place-des-arts", "Place-des-Arts", "green", "central", 320, 248),
  station("bonaventure", "Bonaventure", "orange", "central", 370, 282),
  station("square-victoria", "Square-Victoria-OACI", "orange", "central", 340, 310),

  // North & East
  station("jean-talon-orange", "Jean-Talon", "orange", "north-east", 378, 152, true),
  station("jean-talon-blue", "Jean-Talon", "blue", "north-east", 378, 152, true),
  station("rosemont", "Rosemont", "orange", "north-east", 380, 198),
  station("papineau", "Papineau", "green", "north-east", 428, 248),
  station("frontenac", "Frontenac", "green", "north-east", 468, 248),
  station("honore-beaugrand", "Honoré-Beaugrand", "green", "north-east", 518, 248),
  station("henri-bourassa", "Henri-Bourassa", "orange", "north-east", 380, 115),
  station("cote-vertu", "Côte-Vertu", "orange", "north-east", 98, 152),
  station("snowdon-orange", "Snowdon", "orange", "north-east", 178, 198, true),
  station("snowdon-blue", "Snowdon", "blue", "north-east", 178, 198, true),

  // Laval & South Shore
  station("montmorency", "Montmorency", "orange", "laval-south-shore", 380, 52),
  station("de-la-concorde", "De la Concorde", "orange", "laval-south-shore", 368, 72),
  station("longueuil", "Longueuil–Université-de-Sherbrooke", "yellow", "laval-south-shore", 380, 390),
  station("jean-drapeau", "Jean-Drapeau", "yellow", "laval-south-shore", 380, 340),
  station("radisson", "Radisson", "yellow", "laval-south-shore", 380, 438),
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
export function getMapStationGroups(): {
  key: string;
  name: string;
  x: number;
  y: number;
  isTransferHub: boolean;
  stations: MetroStation[];
}[] {
  const groups = new Map<
    string,
    { key: string; name: string; x: number; y: number; isTransferHub: boolean; stations: MetroStation[] }
  >();
  for (const s of METRO_STATIONS) {
    const key = `${s.name}:${s.x}:${s.y}`;
    const existing = groups.get(key);
    if (existing) {
      existing.stations.push(s);
      existing.isTransferHub = existing.isTransferHub || Boolean(s.isTransferHub);
    } else {
      groups.set(key, {
        key,
        name: s.name,
        x: s.x,
        y: s.y,
        isTransferHub: Boolean(s.isTransferHub),
        stations: [s],
      });
    }
  }
  return [...groups.values()];
}
