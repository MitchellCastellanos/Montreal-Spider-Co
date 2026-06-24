"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import {
  METRO_LINE_COLORS,
  METRO_LINE_PATHS,
  METRO_MAP_LANDMASS,
  METRO_MAP_VIEWBOX,
  METRO_MAP_ZONE_TEXT,
  METRO_SCHEMATIC_DECOR,
  METRO_ZONE_A_BOUNDARY,
  type MetroStation,
  type StationMapLabel,
  calcStationMeetupFee,
  getMapStationGroups,
  getMeetupArea,
  getMetroLine,
  getMetroStation,
} from "@/lib/metro-meetup";
import { t } from "@/lib/types";

export interface MetroMeetupMapProps {
  selectedStationId?: string;
  preferredLineId?: string;
  onSelectStation?: (station: MetroStation) => void;
  subtotal?: number;
  readOnly?: boolean;
  className?: string;
}

export default function MetroMeetupMap({
  selectedStationId,
  preferredLineId,
  onSelectStation,
  subtotal = 0,
  readOnly = false,
  className = "",
}: MetroMeetupMapProps) {
  const { dict, locale } = useI18n();
  const co = dict.checkout;
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const mapGroups = useMemo(() => getMapStationGroups(), []);
  const selectedStation = selectedStationId ? getMetroStation(selectedStationId) : undefined;
  const hoveredGroup = hoveredKey ? mapGroups.find((g) => g.key === hoveredKey) : undefined;
  const interactive = !readOnly && Boolean(onSelectStation);

  const selectFromMapGroup = (stations: MetroStation[]) => {
    if (!onSelectStation) return;
    const preferred =
      stations.find((s) => s.id === selectedStationId) ??
      stations.find((s) => s.line === preferredLineId) ??
      stations[0];
    if (preferred) onSelectStation(preferred);
  };

  const tooltipStation = hoveredGroup?.stations[0] ?? selectedStation;

  return (
    <div className={`overflow-hidden rounded-xl border border-line ${className}`}>
      <svg
        viewBox={`0 0 ${METRO_MAP_VIEWBOX.width} ${METRO_MAP_VIEWBOX.height}`}
        className="h-auto w-full bg-[#cdd6df]"
        role="img"
        aria-label={co.meetupStepStation}
      >
        {METRO_MAP_LANDMASS.map((shape) => (
          <path
            key={shape.id}
            d={shape.d}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.stroke ? 1 : 0}
          />
        ))}

        <path
          d={METRO_ZONE_A_BOUNDARY}
          fill="none"
          stroke="#b0bcc8"
          strokeWidth={1}
          strokeDasharray="5 4"
        />
        {METRO_MAP_ZONE_TEXT.map((z) => (
          <text
            key={`${z.text}-${z.x}-${z.y}`}
            x={z.x}
            y={z.y}
            textAnchor={z.anchor}
            className="fill-[#9aa8b4] font-semibold"
            style={{ fontSize: 11, letterSpacing: 2 }}
          >
            {z.text}
          </text>
        ))}

        {METRO_LINE_PATHS.map((track, i) => (
          <path
            key={`casing-${track.line}-${i}`}
            d={track.d}
            fill="none"
            stroke="#ffffff"
            strokeWidth={13}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {METRO_LINE_PATHS.map((track, i) => {
          const line = getMetroLine(track.line);
          return (
            <path
              key={`track-${track.line}-${i}`}
              d={track.d}
              fill="none"
              stroke={line?.color ?? "#666"}
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Full network labels (decorative) */}
        {METRO_SCHEMATIC_DECOR.map((decor) => (
          <g key={`decor-${decor.name}`} className="pointer-events-none select-none">
            <circle
              cx={decor.x}
              cy={decor.y}
              r={decor.hub ? 4.5 : 3.5}
              fill="#ffffff"
              stroke="#6b7c8a"
              strokeWidth={1.25}
            />
            <StationMapLabelText
              x={decor.x}
              y={decor.y}
              text={decor.label.text ?? decor.name}
              label={decor.label}
              highlighted={false}
              decor
            />
          </g>
        ))}

        {/* Meetup station labels */}
        {mapGroups.map((group) => {
          const isSelected = group.stations.some((s) => s.id === selectedStationId);
          const isHovered = hoveredKey === group.key;
          return (
            <StationMapLabelText
              key={`label-${group.key}`}
              x={group.x}
              y={group.y}
              text={group.mapLabel}
              label={group.label}
              highlighted={isSelected || isHovered}
            />
          );
        })}

        {/* Meetup stations (interactive) */}
        {mapGroups.map((group) => {
          const isSelected = group.stations.some((s) => s.id === selectedStationId);
          const isHovered = hoveredKey === group.key;
          const hub = group.isTransferHub;
          const r = isSelected ? 9 : isHovered ? 8 : hub ? 7 : 5.5;

          return (
            <g
              key={group.key}
              className={interactive ? "cursor-pointer" : "cursor-default"}
              onMouseEnter={() => setHoveredKey(group.key)}
              onMouseLeave={() => setHoveredKey(null)}
              onClick={() => interactive && selectFromMapGroup(group.stations)}
              onKeyDown={(e) => {
                if (!interactive) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectFromMapGroup(group.stations);
                }
              }}
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={group.name}
            >
              {isSelected && (
                <circle cx={group.x} cy={group.y} r={r + 4} fill="none" stroke="#e8c56a" strokeWidth={2} />
              )}
              {hub ? (
                <rect
                  x={group.x - r}
                  y={group.y - r}
                  width={r * 2}
                  height={r * 2}
                  rx={3}
                  fill={isSelected ? "#e8c56a" : "#ffffff"}
                  stroke={isSelected ? "#c9a24b" : isHovered ? "#1a2332" : "#1a2332"}
                  strokeWidth={isSelected ? 2.5 : 2}
                  className="transition-all duration-150"
                />
              ) : (
                <circle
                  cx={group.x}
                  cy={group.y}
                  r={r}
                  fill={isSelected ? "#e8c56a" : "#ffffff"}
                  stroke={isSelected ? "#c9a24b" : isHovered ? "#1a2332" : "#4a5568"}
                  strokeWidth={isSelected ? 2.5 : 1.75}
                  className="transition-all duration-150"
                />
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(20, 672)">
          <circle cx={0} cy={0} r={3.5} fill="#fff" stroke="#6b7c8a" strokeWidth={1.25} />
          <text x={9} y={3} className="fill-[#5a6a78]" style={{ fontSize: 8 }}>
            {co.mapLegendStation}
          </text>
          <rect x={62} y={-5} width={10} height={10} rx={2} fill="#fff" stroke="#1a2332" strokeWidth={1.5} />
          <text x={78} y={3} className="fill-[#5a6a78]" style={{ fontSize: 8 }}>
            {co.mapLegendTransfer}
          </text>
          <circle cx={148} cy={0} r={5} fill="none" stroke="#e8c56a" strokeWidth={1.75} />
          <text x={158} y={3} className="fill-[#5a6a78]" style={{ fontSize: 8 }}>
            {co.mapLegendMeetup}
          </text>
        </g>
      </svg>

      {tooltipStation && (
        <MetroMapTooltip station={tooltipStation} subtotal={subtotal} locale={locale} />
      )}
    </div>
  );
}

function StationMapLabelText({
  x,
  y,
  text,
  label,
  highlighted,
  decor = false,
}: {
  x: number;
  y: number;
  text: string;
  label: StationMapLabel;
  highlighted: boolean;
  decor?: boolean;
}) {
  const lx = x + label.dx;
  const ly = y + label.dy;
  const fontSize = decor ? 7 : highlighted ? 9.5 : 8;
  const fill = decor ? "#5c6d7a" : highlighted ? "#0f172a" : "#1e293b";

  if (label.terminalLine) {
    const color = METRO_LINE_COLORS[label.terminalLine];
    const upper = text.toUpperCase();
    const charW = decor ? 4.6 : 5.1;
    const padX = 3;
    const boxH = decor ? 10 : 11;
    const boxW = upper.length * charW + padX * 2;
    let boxX = lx;
    if (label.anchor === "middle") boxX = lx - boxW / 2;
    else if (label.anchor === "end") boxX = lx - boxW;

    return (
      <g className="pointer-events-none select-none">
        <rect x={boxX} y={ly - boxH + 2} width={boxW} height={boxH} rx={1} fill={color} />
        <text
          x={boxX + padX}
          y={ly}
          textAnchor="start"
          className="fill-white font-bold"
          style={{ fontSize: decor ? 6.5 : 7.5, letterSpacing: 0.3 }}
        >
          {upper}
        </text>
      </g>
    );
  }

  return (
    <text
      x={lx}
      y={ly}
      textAnchor={label.anchor}
      className={`pointer-events-none select-none ${highlighted && !decor ? "font-semibold" : "font-medium"}`}
      style={{
        fontSize,
        fill,
        paintOrder: "stroke",
        stroke: "#f2f5f8",
        strokeWidth: decor ? 2.5 : highlighted ? 4 : 3,
      }}
    >
      {text}
    </text>
  );
}

function MetroMapTooltip({
  station,
  subtotal,
  locale,
}: {
  station: MetroStation;
  subtotal: number;
  locale: "en" | "fr";
}) {
  const { dict } = useI18n();
  const co = dict.checkout;
  const area = getMeetupArea(station.area);
  const line = getMetroLine(station.line);
  const fee = calcStationMeetupFee(subtotal, station);

  return (
    <div className="border-t border-line bg-ink-soft/50 px-4 py-3 text-sm">
      <p className="font-semibold text-cream">{station.name}</p>
      {area && <p className="text-xs text-muted">{t(area.name, locale)}</p>}
      {line && (
        <p className="text-xs text-muted">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: line.color }}
          />
          {t(line.name, locale)}
        </p>
      )}
      <p className="mt-1 text-bone">
        {co.meetupFeeLabel}: {fee === 0 ? dict.common.free : formatPrice(fee, locale)}
      </p>
      <p className="text-xs text-muted">
        {co.meetupFreeOver} {formatPrice(station.freeMeetupThreshold, locale)}
      </p>
    </div>
  );
}
