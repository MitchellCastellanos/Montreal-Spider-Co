"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import {
  METRO_LINE_PATHS,
  METRO_MAP_VIEWBOX,
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
  /** Cart subtotal for fee preview; 0 shows base area fees. */
  subtotal?: number;
  /** When true, stations are not selectable (hover tooltips still work). */
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
    <div className={`overflow-hidden rounded-xl border border-line bg-ink-soft/30 ${className}`}>
      <svg
        viewBox={`0 0 ${METRO_MAP_VIEWBOX.width} ${METRO_MAP_VIEWBOX.height}`}
        className="h-auto w-full"
        role="img"
        aria-label={co.meetupStepStation}
      >
        {METRO_LINE_PATHS.map((track) => {
          const line = getMetroLine(track.line);
          return (
            <path
              key={track.line}
              d={track.d}
              fill="none"
              stroke={line?.color ?? "#666"}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.55}
            />
          );
        })}

        {mapGroups.map((group) => {
          const isSelected = group.stations.some((s) => s.id === selectedStationId);
          const isHovered = hoveredKey === group.key;

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
              <circle
                cx={group.x}
                cy={group.y}
                r={isSelected ? 11 : isHovered ? 10 : 7}
                fill={isSelected ? "var(--gold-bright)" : isHovered ? "var(--cream)" : "var(--bone)"}
                stroke={isSelected ? "var(--gold)" : "var(--line)"}
                strokeWidth={isSelected ? 2.5 : 1.5}
                className="transition-all duration-150"
              />
              {(isSelected || isHovered) && (
                <text
                  x={group.x}
                  y={group.y - 14}
                  textAnchor="middle"
                  className="fill-cream"
                  style={{ fontSize: 10 }}
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
      {line && <p className="text-xs text-muted">{t(line.name, locale)}</p>}
      <p className="mt-1 text-bone">
        {co.meetupFeeLabel}: {fee === 0 ? dict.common.free : formatPrice(fee, locale)}
      </p>
      <p className="text-xs text-muted">
        {co.meetupFreeOver} {formatPrice(station.freeMeetupThreshold, locale)}
      </p>
    </div>
  );
}
