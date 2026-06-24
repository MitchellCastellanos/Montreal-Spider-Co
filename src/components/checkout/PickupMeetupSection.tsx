"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import { formatWeeklyHoursSummary } from "@/lib/opening-hours";
import type { WeeklyHours } from "@/lib/opening-hours";
import {
  MEETUP_AVAILABILITY_OPTIONS,
  MEETUP_ZONES,
  type MeetupAvailability,
  type PickupSubtype,
  calcMeetupFee,
  getLinesForZone,
  getMeetupZone,
  getMetroStation,
  getStationsForZoneAndLine,
  stationDisplayName,
} from "@/lib/metro-meetup";
import { t } from "@/lib/types";

export interface PickupOption {
  id: string;
  name: string;
  neighborhood: string;
  hours: WeeklyHours;
}

interface PickupMeetupSectionProps {
  pickups: PickupOption[];
  pickupPolicy: string;
  pickupSubtype: PickupSubtype;
  onPickupSubtypeChange: (v: PickupSubtype) => void;
  pickupId: string;
  onPickupIdChange: (v: string) => void;
  meetupZoneId: string;
  onMeetupZoneIdChange: (v: string) => void;
  metroLineId: string;
  onMetroLineIdChange: (v: string) => void;
  metroStationId: string;
  onMetroStationIdChange: (v: string) => void;
  meetupAvailability: MeetupAvailability;
  onMeetupAvailabilityChange: (v: MeetupAvailability) => void;
  customMeetupRequest: string;
  onCustomMeetupRequestChange: (v: string) => void;
  subtotal: number;
  errors: Record<string, boolean>;
}

function Field({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className={error ? "text-danger" : ""}>{label}</span>
      <div className={error ? "rounded-md ring-1 ring-danger" : ""}>{children}</div>
    </label>
  );
}

function SubOptionCard({
  active,
  onClick,
  title,
  desc,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${active ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-cream">{title}</span>
        {badge && <span className="badge shrink-0">{badge}</span>}
      </div>
      <p className="mt-1 text-sm text-bone">{desc}</p>
    </button>
  );
}

export default function PickupMeetupSection({
  pickups,
  pickupPolicy,
  pickupSubtype,
  onPickupSubtypeChange,
  pickupId,
  onPickupIdChange,
  meetupZoneId,
  onMeetupZoneIdChange,
  metroLineId,
  onMetroLineIdChange,
  metroStationId,
  onMetroStationIdChange,
  meetupAvailability,
  onMeetupAvailabilityChange,
  customMeetupRequest,
  onCustomMeetupRequestChange,
  subtotal,
  errors,
}: PickupMeetupSectionProps) {
  const { dict, locale } = useI18n();
  const co = dict.checkout;

  const meetupZone = getMeetupZone(meetupZoneId);
  const linesInZone = useMemo(() => getLinesForZone(meetupZoneId), [meetupZoneId]);
  const stationsInZoneLine = useMemo(
    () => getStationsForZoneAndLine(meetupZoneId, metroLineId),
    [meetupZoneId, metroLineId],
  );
  const selectedStation = metroStationId ? getMetroStation(metroStationId) : undefined;
  const meetupFee = meetupZone ? calcMeetupFee(subtotal, meetupZone) : 0;

  const handleZoneChange = (zoneId: string) => {
    onMeetupZoneIdChange(zoneId);
    const lines = getLinesForZone(zoneId);
    const firstLine = lines[0]?.id ?? "";
    onMetroLineIdChange(firstLine);
    const stations = getStationsForZoneAndLine(zoneId, firstLine);
    onMetroStationIdChange(stations[0]?.id ?? "");
  };

  const handleLineChange = (lineId: string) => {
    onMetroLineIdChange(lineId);
    const stations = getStationsForZoneAndLine(meetupZoneId, lineId);
    onMetroStationIdChange(stations[0]?.id ?? "");
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SubOptionCard
          active={pickupSubtype === "pickup_point"}
          onClick={() => onPickupSubtypeChange("pickup_point")}
          title={co.pickupSubtypePoint}
          desc={co.pickupSubtypePointDesc}
          badge={dict.common.free}
        />
        <SubOptionCard
          active={pickupSubtype === "metro_meetup"}
          onClick={() => onPickupSubtypeChange("metro_meetup")}
          title={co.pickupSubtypeMetro}
          desc={co.pickupSubtypeMetroDesc}
        />
        <SubOptionCard
          active={pickupSubtype === "custom_meetup"}
          onClick={() => onPickupSubtypeChange("custom_meetup")}
          title={co.pickupSubtypeCustom}
          desc={co.pickupSubtypeCustomDesc}
        />
      </div>

      {pickupSubtype === "pickup_point" && (
        <div>
          <Field label={co.selectPickup}>
            <select className="input" value={pickupId} onChange={(e) => onPickupIdChange(e.target.value)}>
              {pickups.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.neighborhood}
                </option>
              ))}
            </select>
          </Field>
          {pickups.find((p) => p.id === pickupId) && (
            <p className="mt-2 text-sm text-bone">
              {formatWeeklyHoursSummary(pickups.find((p) => p.id === pickupId)!.hours, locale)}
            </p>
          )}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-gold/25 bg-gold/5 p-3 text-xs leading-relaxed text-bone">
            <span className="text-gold-bright">⏳</span>
            <span>{pickupPolicy}</span>
          </div>
        </div>
      )}

      {pickupSubtype === "metro_meetup" && (
        <div className="space-y-4">
          <Field label={co.meetupStepZone}>
            <select className="input" value={meetupZoneId} onChange={(e) => handleZoneChange(e.target.value)}>
              {MEETUP_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {t(z.name, locale)} — {formatPrice(z.fee, locale)} · {co.meetupFreeOver} {formatPrice(z.freeMeetupThreshold, locale)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={co.meetupStepLine} error={errors.metroLine}>
            <select
              className="input"
              value={metroLineId}
              onChange={(e) => handleLineChange(e.target.value)}
              disabled={!meetupZoneId}
            >
              {linesInZone.map((line) => (
                <option key={line.id} value={line.id}>
                  {t(line.name, locale)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={co.meetupStepStation} error={errors.metroStation}>
            <select
              className="input"
              value={metroStationId}
              onChange={(e) => onMetroStationIdChange(e.target.value)}
              disabled={!metroLineId}
            >
              {stationsInZoneLine.map((s) => (
                <option key={s.id} value={s.id}>
                  {stationDisplayName(s, locale)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={co.meetupAvailability} error={errors.meetupAvailability}>
            <select
              className="input"
              value={meetupAvailability}
              onChange={(e) => onMeetupAvailabilityChange(e.target.value as MeetupAvailability)}
            >
              {MEETUP_AVAILABILITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {t(opt.label, locale)}
                </option>
              ))}
            </select>
          </Field>

          {meetupZone && (
            <div className="rounded-lg border border-line bg-ink-soft/40 p-3 text-sm text-bone">
              <p>
                {co.meetupFeeLabel}:{" "}
                <span className="font-medium text-cream">
                  {meetupFee === 0 ? dict.common.free : formatPrice(meetupFee, locale)}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted">
                {co.meetupFreeOver} {formatPrice(meetupZone.freeMeetupThreshold, locale)}
              </p>
            </div>
          )}

          {selectedStation && (
            <p className="text-xs text-muted">
              {co.meetupSelectedStation}: {stationDisplayName(selectedStation, locale)}
            </p>
          )}
        </div>
      )}

      {pickupSubtype === "custom_meetup" && (
        <div className="space-y-3">
          <Field label={co.customMeetupLabel} error={errors.customMeetup}>
            <textarea
              className="input min-h-20 resize-y"
              value={customMeetupRequest}
              onChange={(e) => onCustomMeetupRequestChange(e.target.value)}
              placeholder={co.customMeetupPlaceholder}
            />
          </Field>
          <p className="rounded-lg border border-gold/25 bg-gold/5 p-3 text-xs leading-relaxed text-bone">
            {co.customMeetupFeeNote}
          </p>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-line bg-ink-soft/40 p-3 text-xs leading-relaxed text-bone">
        <span className="text-gold-bright">📍</span>
        <span>{co.pickupMeetupCoordination}</span>
      </div>
    </div>
  );
}

export function PickupMeetupSummary({
  pickupSubtype,
  pickups,
  pickupId,
  meetupZoneId,
  metroLineId,
  metroStationId,
  meetupAvailability,
  customMeetupRequest,
  fulfillmentFee,
}: {
  pickupSubtype: PickupSubtype;
  pickups: PickupOption[];
  pickupId: string;
  meetupZoneId: string;
  metroLineId: string;
  metroStationId: string;
  meetupAvailability: MeetupAvailability;
  customMeetupRequest: string;
  fulfillmentFee: number;
}) {
  const { dict, locale } = useI18n();
  const co = dict.checkout;

  const meetupZone = getMeetupZone(meetupZoneId);
  const station = metroStationId ? getMetroStation(metroStationId) : undefined;
  const line = metroLineId ? getLinesForZone(meetupZoneId).find((l) => l.id === metroLineId) : undefined;
  const availabilityOpt = MEETUP_AVAILABILITY_OPTIONS.find((o) => o.id === meetupAvailability);
  const pickup = pickups.find((p) => p.id === pickupId);

  return (
    <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs">
      <p className="font-medium text-cream">{co.summaryFulfillment}</p>
      <SummaryRow label={co.summaryMethod} value={co.deliveryPickup} />
      {pickupSubtype === "pickup_point" && pickup && (
        <SummaryRow label={co.selectPickup} value={`${pickup.name} — ${pickup.neighborhood}`} />
      )}
      {pickupSubtype === "metro_meetup" && (
        <>
          {meetupZone && <SummaryRow label={co.meetupStepZone} value={t(meetupZone.name, locale)} />}
          {line && <SummaryRow label={co.meetupStepLine} value={t(line.name, locale)} />}
          {station && <SummaryRow label={co.meetupStepStation} value={station.name} />}
          {availabilityOpt && <SummaryRow label={co.meetupAvailability} value={t(availabilityOpt.label, locale)} />}
          {meetupZone && (
            <SummaryRow
              label={co.meetupFreeOver}
              value={formatPrice(meetupZone.freeMeetupThreshold, locale)}
            />
          )}
        </>
      )}
      {pickupSubtype === "custom_meetup" && customMeetupRequest.trim() && (
        <SummaryRow label={co.customMeetupLabel} value={customMeetupRequest.trim()} />
      )}
      <SummaryRow
        label={co.pickupMeetupFee}
        value={fulfillmentFee === 0 ? dict.common.free : formatPrice(fulfillmentFee, locale)}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-right text-bone">{value}</span>
    </div>
  );
}
