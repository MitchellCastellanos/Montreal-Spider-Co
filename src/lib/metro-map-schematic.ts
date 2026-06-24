/** STM-inspired schematic map geometry (not geographically exact). */
export const METRO_MAP_VIEWBOX = { width: 640, height: 520 };

type SchematicLineId = "green" | "orange" | "blue" | "yellow";
type SchematicAreaId = "southwest" | "central" | "north-east" | "laval-south-shore";

/** Simplified land/water shapes — island, Laval, South Shore. */
export const METRO_MAP_LANDMASS: { id: string; d: string; fill: string }[] = [
  {
    id: "water",
    d: "M 0 0 H 640 V 520 H 0 Z",
    fill: "#dce4ec",
  },
  {
    id: "south-shore",
    d: "M 280 400 Q 360 395 420 420 L 480 520 H 260 L 240 430 Z",
    fill: "#eef2f6",
  },
  {
    id: "laval",
    d: "M 180 0 L 520 0 L 500 95 Q 380 110 260 100 L 180 55 Z",
    fill: "#eef2f6",
  },
  {
    id: "island",
    d: "M 95 155 Q 120 95 220 85 L 520 115 Q 585 180 560 290 L 500 395 Q 380 420 250 400 L 120 360 Q 75 280 95 155 Z",
    fill: "#f6f8fa",
  },
];

export const METRO_MAP_ZONE_LABELS: {
  area: SchematicAreaId;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
}[] = [
  { area: "southwest", x: 165, y: 355, anchor: "middle" },
  { area: "central", x: 330, y: 285, anchor: "middle" },
  { area: "north-east", x: 455, y: 175, anchor: "middle" },
  { area: "laval-south-shore", x: 395, y: 48, anchor: "middle" },
];

/** Schematic track segments per line (45° / 90° angles, STM-style). */
export const METRO_LINE_PATHS: { line: SchematicLineId; d: string }[] = [
  // Orange — Laval spine, downtown south leg, west branch to Côte-Vertu
  { line: "orange", d: "M 380 52 L 380 248 L 238 248 L 98 152" },
  { line: "orange", d: "M 380 248 L 370 282 L 288 328" },
  // Green — Angrignon ↔ Honoré-Beaugrand through downtown
  { line: "green", d: "M 152 362 L 172 308 L 198 272 L 238 248 L 518 248" },
  // Blue — Snowdon ↔ Jean-Talon
  { line: "blue", d: "M 178 198 L 378 152" },
  // Yellow — Berri ↔ Radisson (South Shore)
  { line: "yellow", d: "M 380 248 L 380 438" },
];
