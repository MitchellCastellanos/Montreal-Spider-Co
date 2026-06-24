"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import {
  MEETUP_AREAS,
  METRO_LINE_PATHS,
  METRO_MAP_LANDMASS,
  METRO_MAP_VIEWBOX,
  METRO_MAP_ZONE_LABELS,
  type MetroStation,
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
        className="h-auto w-full bg-[#dce4ec]"
        role="img"
        aria-label={co.meetupStepStation}
      >
        {/* Geographic backdrop */}
        {METRO_MAP_LANDMASS.map((shape) => (
          <path key={shape.id} d={shape.d} fill={shape.fill} />
        ))}

        {/* Meetup area hints */}
        {METRO_MAP_ZONE_LABELS.map((label) => {
          const area = MEETUP_AREAS.find((a) => a.id === label.area);
          if (!area) return null;
          return (
            <text
              key={label.area}
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              className="select-none fill-[#9aa8b6] font-medium uppercase tracking-widest"
              style={{ fontSize: 9 }}
            >
              {t(area.name, locale)}
            </text>
          );
        })}

        {/* Line casings (white) then coloured tracks — STM-style */}
        {METRO_LINE_PATHS.map((track, i) => (
          <path
            key={`casing-${track.line}-${i}`}
            d={track.d}
            fill="none"
            stroke="#ffffff"
            strokeWidth={11}
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
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Stations */}
        {mapGroups.map((group) => {
          const isSelected = group.stations.some((s) => s.id === selectedStationId);
          const isHovered = hoveredKey === group.key;
          const hub = group.isTransferHub;
          const r = isSelected ? 10 : isHovered ? 9 : hub ? 8 : 6;

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
              {hub ? (
                <rect
                  x={group.x - r}
                  y={group.y - r}
                  width={r * 2}
                  height={r * 2}
                  rx={3}
                  fill={isSelected ? "#e8c56a" : "#ffffff"}
                  stroke={isSelected ? "#c9a24b" : isHovered ? "#2d3748" : "#1a2332"}
                  strokeWidth={isSelected ? 2.5 : 2}
                  className="transition-all duration-150"
                />
              ) : (
                <circle
                  cx={group.x}
                  cy={group.y}
                  r={r}
                  fill={isSelected ? "#e8c56a" : "#ffffff"}
                  stroke={isSelected ? "#c9a24b" : isHovered ? "#2d3748" : "#4a5568"}
                  strokeWidth={isSelected ? 2.5 : 1.75}
                  className="transition-all duration-150"
                />
              )}
              {(isSelected || isHovered) && (
                <text
                  x={group.x}
                  y={group.y - (hub ? 16 : 14)}
                  textAnchor="middle"
                  className="fill-[#1a2332] font-medium"
                  style={{ fontSize: 10, paintOrder: "stroke", stroke: "#f6f8fa", strokeWidth: 3 }}
                >
                  {group.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {tooltipStation && (
        <MetroMapTooltip station={tooltipStation} subtotal={subtotal} locale={locale} />
      )}
    </div>
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
