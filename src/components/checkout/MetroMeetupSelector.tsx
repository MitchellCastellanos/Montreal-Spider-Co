"use client";

import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import MetroMeetupMap from "@/components/MetroMeetupMap";
import {
  MEETUP_AREAS,
  type MetroLineId,
  type MetroStation,
  calcStationMeetupFee,
  getLinesForArea,
  getMeetupArea,
  getMetroLine,
  getMetroStation,
  getStationsForArea,
  stationDisplayName,
} from "@/lib/metro-meetup";
import { t } from "@/lib/types";

type ViewMode = "map" | "list";

interface MetroMeetupSelectorProps {
  areaId: string;
  lineId: string;
  stationId: string;
  subtotal: number;
  onAreaChange: (areaId: string) => void;
  onLineChange: (lineId: string) => void;
  onStationChange: (stationId: string) => void;
  errors: { metroLine?: boolean; metroStation?: boolean };
}

export default function MetroMeetupSelector({
  areaId,
  lineId,
  stationId,
  subtotal,
  onAreaChange,
  onLineChange,
  onStationChange,
  errors,
}: MetroMeetupSelectorProps) {
  const { dict, locale } = useI18n();
  const co = dict.checkout;
  const [view, setView] = useState<ViewMode>("map");
  const [listAreaId, setListAreaId] = useState(areaId);
  const [lineFilter, setLineFilter] = useState<MetroLineId | "all">("all");
  const [search, setSearch] = useState("");

  const selectedStation = stationId ? getMetroStation(stationId) : undefined;
  const selectedArea = getMeetupArea(areaId);
  const meetupFee = selectedStation ? calcStationMeetupFee(subtotal, selectedStation) : 0;

  const listStations = useMemo(() => {
    let stations = getStationsForArea(listAreaId);
    if (lineFilter !== "all") {
      stations = stations.filter((s) => s.line === lineFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      stations = stations.filter((s) => s.name.toLowerCase().includes(q));
    }
    return stations;
  }, [listAreaId, lineFilter, search]);

  const listLines = useMemo(() => getLinesForArea(listAreaId), [listAreaId]);

  const selectStation = useCallback((station: MetroStation) => {
    onAreaChange(station.area);
    onLineChange(station.line);
    onStationChange(station.id);
    setListAreaId(station.area);
  }, [onAreaChange, onLineChange, onStationChange]);

  const handleListAreaSelect = (id: string) => {
    setListAreaId(id);
    setLineFilter("all");
    setSearch("");
    const lines = getLinesForArea(id);
    const firstLine = lines[0]?.id ?? "";
    const stations = getStationsForArea(id);
    const first = stations.find((s) => s.line === firstLine) ?? stations[0];
    if (first) selectStation(first);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ViewToggle active={view === "map"} onClick={() => setView("map")} label={co.meetupViewMap} />
        <ViewToggle active={view === "list"} onClick={() => setView("list")} label={co.meetupViewList} />
      </div>

      {view === "map" ? (
        <MetroMeetupMap
          selectedStationId={stationId}
          preferredLineId={lineId}
          onSelectStation={selectStation}
          subtotal={subtotal}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {MEETUP_AREAS.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => handleListAreaSelect(area.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  listAreaId === area.id ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"
                }`}
              >
                <p className="font-semibold text-cream">{t(area.name, locale)}</p>
                <p className="mt-1 text-xs text-bone">
                  {formatPrice(area.fee, locale)} · {co.meetupFreeOver} {formatPrice(area.freeMeetupThreshold, locale)}
                </p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <LineChip active={lineFilter === "all"} onClick={() => setLineFilter("all")} label={co.meetupAllLines} />
            {listLines.map((line) => (
              <LineChip
                key={line.id}
                active={lineFilter === line.id}
                onClick={() => setLineFilter(line.id)}
                label={t(line.name, locale)}
                color={line.color}
              />
            ))}
          </div>

          <input
            type="search"
            className="input text-sm"
            placeholder={co.meetupSearchStation}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div
            className={`max-h-56 space-y-1 overflow-y-auto rounded-xl border p-2 ${
              errors.metroStation ? "border-danger ring-1 ring-danger" : "border-line"
            }`}
          >
            {listStations.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted">{co.meetupNoStations}</p>
            ) : (
              listStations.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectStation(s)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    stationId === s.id ? "bg-gold/15 text-cream" : "text-bone hover:bg-ink-soft/60"
                  }`}
                >
                  <span>{stationDisplayName(s, locale)}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {calcStationMeetupFee(subtotal, s) === 0 ? dict.common.free : formatPrice(s.fee, locale)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {selectedStation && selectedArea && (
        <div className="rounded-lg border border-line bg-ink-soft/40 p-3 text-sm text-bone">
          <p className="font-medium text-cream">{stationDisplayName(selectedStation, locale)}</p>
          <p className="mt-1 text-xs text-muted">
            {t(selectedArea.name, locale)} · {t(getMetroLine(selectedStation.line)!.name, locale)}
          </p>
          <p className="mt-2">
            {co.meetupFeeLabel}:{" "}
            <span className="font-medium text-cream">
              {meetupFee === 0 ? dict.common.free : formatPrice(meetupFee, locale)}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {co.meetupFreeOver} {formatPrice(selectedStation.freeMeetupThreshold, locale)}
          </p>
        </div>
      )}
    </div>
  );
}

function ViewToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
        active ? "border-gold bg-gold/10 text-cream" : "border-line text-bone hover:border-gold/50"
      }`}
    >
      {label}
    </button>
  );
}

function LineChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active ? "border-gold bg-gold/10 text-cream" : "border-line text-bone hover:border-gold/50"
      }`}
    >
      {color && (
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      {label}
    </button>
  );
}
