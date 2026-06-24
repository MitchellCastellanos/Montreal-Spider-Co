/** STM-inspired schematic map geometry (traced from official layout, not a copy). */
export const METRO_MAP_VIEWBOX = { width: 880, height: 700 };

type SchematicLineId = "green" | "orange" | "blue" | "yellow";

export type StationMapLabel = {
  text?: string;
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
  terminalLine?: SchematicLineId;
};

export const METRO_LINE_COLORS: Record<SchematicLineId, string> = {
  orange: "#F58220",
  green: "#008B45",
  blue: "#005596",
  yellow: "#FFD100",
};

export type SchematicDecorStation = {
  name: string;
  x: number;
  y: number;
  hub?: boolean;
  label: StationMapLabel;
};

/** Non-meetup stations shown for STM-style network context (not interactive). */
export const METRO_SCHEMATIC_DECOR: SchematicDecorStation[] = [
  { name: "Cartier", x: 418, y: 68, label: { dx: -8, dy: 3, anchor: "end" } },
  { name: "Sauvé", x: 432, y: 82, label: { dx: 10, dy: 3, anchor: "start" } },
  { name: "Crémazie", x: 438, y: 98, label: { dx: 10, dy: 3, anchor: "start" } },
  { name: "Jarry", x: 448, y: 118, label: { dx: 10, dy: 3, anchor: "start" } },
  { name: "Beaubien", x: 452, y: 168, label: { dx: 10, dy: 3, anchor: "start" } },
  { name: "Laurier", x: 442, y: 228, label: { dx: 10, dy: 3, anchor: "start" } },
  { name: "Mont-Royal", x: 438, y: 258, label: { dx: 10, dy: 3, anchor: "start" } },
  { name: "Sherbrooke", x: 442, y: 278, label: { dx: 10, dy: -10, anchor: "start" } },
  { name: "Saint-Laurent", x: 405, y: 298, label: { dx: 0, dy: -11, anchor: "middle" } },
  { name: "Peel", x: 318, y: 298, label: { dx: 0, dy: -11, anchor: "middle" } },
  { name: "Guy-Concordia", x: 298, y: 298, label: { dx: -8, dy: -11, anchor: "end", text: "Guy-Concordia" } },
  { name: "Atwater", x: 278, y: 298, label: { dx: 0, dy: 14, anchor: "middle" } },
  { name: "Georges-Vanier", x: 292, y: 318, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "Place-d'Armes", x: 368, y: 408, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "Champ-de-Mars", x: 402, y: 388, label: { dx: 10, dy: 3, anchor: "start" } },
  { name: "Place-Saint-Henri", x: 262, y: 288, label: { dx: -10, dy: -10, anchor: "end", text: "Place-Saint-Henri" } },
  { name: "Villa-Maria", x: 232, y: 258, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "Côte-Sainte-Catherine", x: 198, y: 228, label: { dx: -10, dy: 3, anchor: "end", text: "Côte-Sainte-Cath." } },
  { name: "Plamondon", x: 168, y: 208, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "Namur", x: 142, y: 198, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "De La Savane", x: 128, y: 192, label: { dx: 0, dy: -10, anchor: "middle" } },
  { name: "Du Collège", x: 118, y: 190, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "Jolicoeur", x: 148, y: 368, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "Verdun", x: 168, y: 352, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "De L'Église", x: 188, y: 338, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "Lasalle", x: 205, y: 325, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "Charlevoix", x: 228, y: 312, label: { dx: -10, dy: 12, anchor: "end" } },
  { name: "Beaudry", x: 458, y: 298, label: { dx: 0, dy: 14, anchor: "middle" } },
  { name: "Préfontaine", x: 508, y: 298, label: { dx: 0, dy: -11, anchor: "middle" } },
  { name: "Joliette", x: 532, y: 298, label: { dx: 0, dy: 14, anchor: "middle" } },
  { name: "Pie-IX", x: 548, y: 298, label: { dx: 0, dy: -11, anchor: "middle" } },
  { name: "Viau", x: 568, y: 298, label: { dx: 0, dy: 14, anchor: "middle" } },
  { name: "Assomption", x: 582, y: 298, label: { dx: 10, dy: 3, anchor: "start" } },
  { name: "Cadillac", x: 592, y: 298, label: { dx: 0, dy: -11, anchor: "middle" } },
  { name: "Langelier", x: 608, y: 298, label: { dx: 0, dy: 14, anchor: "middle" } },
  { name: "Côte-des-Neiges", x: 228, y: 218, label: { dx: -10, dy: 3, anchor: "end" } },
  { name: "Université-de-Montréal", x: 288, y: 198, label: { dx: 0, dy: -10, anchor: "middle", text: "Univ. de Montréal" } },
  { name: "Édouard-Montpetit", x: 328, y: 188, label: { dx: 0, dy: -10, anchor: "middle", text: "Édouard-Montpetit" } },
  { name: "Outremont", x: 362, y: 182, label: { dx: 0, dy: -10, anchor: "middle" } },
  { name: "Acadie", x: 392, y: 178, label: { dx: 0, dy: -10, anchor: "middle" } },
  { name: "Parc", x: 418, y: 176, label: { dx: 0, dy: 14, anchor: "middle" } },
  { name: "De Castelnau", x: 438, y: 182, label: { dx: 10, dy: 3, anchor: "start" } },
  { name: "Fabre", x: 488, y: 178, label: { dx: 10, dy: 3, anchor: "start" } },
  { name: "D'Iberville", x: 522, y: 172, label: { dx: 10, dy: 3, anchor: "start" } },
  {
    name: "Saint-Michel",
    x: 568,
    y: 158,
    label: { dx: 10, dy: 3, anchor: "start", terminalLine: "blue" },
  },
];

/** Meetup station label placement (key = station display name). */
export const STATION_MAP_LABELS: Record<string, StationMapLabel> = {
  Montmorency: { dx: 12, dy: 4, anchor: "start", terminalLine: "orange" },
  "De la Concorde": { dx: -10, dy: 3, anchor: "end" },
  "Henri-Bourassa": { dx: 12, dy: 3, anchor: "start" },
  "Jean-Talon": { dx: 12, dy: -10, anchor: "start" },
  Rosemont: { dx: 12, dy: 3, anchor: "start" },
  "Berri-UQAM": { dx: 0, dy: -14, anchor: "middle" },
  McGill: { dx: 0, dy: -12, anchor: "middle" },
  "Place-des-Arts": { dx: 0, dy: 14, anchor: "middle" },
  Papineau: { dx: 0, dy: -12, anchor: "middle" },
  Frontenac: { dx: 0, dy: 14, anchor: "middle" },
  "Honoré-Beaugrand": { dx: 12, dy: 3, anchor: "start", terminalLine: "green" },
  "Lionel-Groulx": { dx: -12, dy: 14, anchor: "end" },
  Snowdon: { dx: -12, dy: -10, anchor: "end" },
  "Côte-Vertu": { dx: -12, dy: 3, anchor: "end", terminalLine: "orange" },
  Bonaventure: { dx: 12, dy: 3, anchor: "start" },
  "Square-Victoria-OACI": { dx: -10, dy: 3, anchor: "end", text: "Square-Victoria" },
  "Lucien-L'Allier": { dx: -10, dy: 3, anchor: "end" },
  Vendôme: { dx: -12, dy: -10, anchor: "end" },
  Monk: { dx: -12, dy: 3, anchor: "end" },
  Angrignon: { dx: -12, dy: 4, anchor: "end", terminalLine: "green" },
  "Jean-Drapeau": { dx: 12, dy: 3, anchor: "start" },
  "Longueuil–Université-de-Sherbrooke": {
    dx: 12,
    dy: 3,
    anchor: "start",
    text: "Longueuil",
    terminalLine: "yellow",
  },
  Radisson: { dx: 0, dy: -12, anchor: "middle" },
};

export const METRO_MAP_LANDMASS: { id: string; d: string; fill: string; stroke?: string }[] = [
  { id: "water", d: "M 0 0 H 880 V 700 H 0 Z", fill: "#cdd6df" },
  {
    id: "river-east",
    d: "M 520 310 Q 620 340 700 420 L 880 520 V 700 H 520 Q 480 400 520 310 Z",
    fill: "#b8c4d0",
  },
  {
    id: "river-west",
    d: "M 0 280 Q 80 320 120 380 L 180 700 H 0 Z",
    fill: "#b8c4d0",
  },
  {
    id: "laval",
    d: "M 180 0 L 700 0 L 670 118 Q 480 138 300 122 L 180 72 Z",
    fill: "#e6ebf0",
  },
  {
    id: "south-shore",
    d: "M 340 500 Q 450 490 540 530 L 680 700 H 300 L 280 540 Z",
    fill: "#e6ebf0",
  },
  {
    id: "island",
    d: "M 95 195 Q 130 115 270 102 L 620 138 Q 710 210 680 340 L 620 480 Q 460 520 300 500 L 140 450 Q 70 350 95 195 Z",
    fill: "#f2f5f8",
    stroke: "#d0d8e0",
  },
];

/** Zone A boundary (dashed) — simplified ellipse around island core. */
export const METRO_ZONE_A_BOUNDARY =
  "M 155 210 Q 440 120 725 210 Q 760 350 620 490 Q 440 560 220 490 Q 100 350 155 210 Z";

export const METRO_MAP_ZONE_TEXT = [
  { text: "ZONE A", x: 440, y: 268, anchor: "middle" as const },
  { text: "ZONE B", x: 440, y: 42, anchor: "middle" as const },
  { text: "ZONE B", x: 440, y: 655, anchor: "middle" as const },
];

export const METRO_LINE_PATHS: { line: SchematicLineId; d: string }[] = [
  // Orange — Côte-Vertu branch
  { line: "orange", d: "M 108 188 L 142 195 L 212 238 L 248 268 L 278 298" },
  // Orange — Lionel south loop to Berri
  { line: "orange", d: "M 278 298 L 292 318 L 330 355 L 385 375 L 345 398 L 378 372 L 418 338 L 440 295" },
  // Orange — Berri north to Montmorency
  { line: "orange", d: "M 440 295 L 438 245 L 458 188 L 435 95 L 422 52 L 425 28" },
  // Green — Angrignon to Lionel
  { line: "green", d: "M 88 415 L 125 385 L 168 342 L 220 312 L 278 298" },
  // Green — Lionel east to Honoré-Beaugrand
  { line: "green", d: "M 278 298 L 598 298" },
  // Blue — Snowdon to Saint-Michel
  { line: "blue", d: "M 212 238 L 288 198 L 458 188 L 568 158" },
  // Yellow — Berri to Longueuil
  { line: "yellow", d: "M 440 295 L 440 445" },
];
