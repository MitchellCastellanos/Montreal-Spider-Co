"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import MetroMeetupSelector from "@/components/checkout/MetroMeetupSelector";
import type { PickupOption } from "@/components/checkout/PickupMeetupSection";
import { formatWeeklyHoursSummary } from "@/lib/opening-hours";
import {
  MEETUP_AVAILABILITY_OPTIONS,
  type MeetupAvailability,
  type PickupSubtype,
  getLinesForArea,
  getMetroStation,
  getStationsForAreaAndLine,
} from "@/lib/metro-meetup";
import { t } from "@/lib/types";

export function buildFulfillmentPreferencesPayload(
  pickupSubtype: PickupSubtype,
  pickupId: string,
  meetupZoneId: string,
  metroLineId: string,
  metroStationId: string,
  meetupAvailability: MeetupAvailability,
  customMeetupRequest: string,
) {
  if (pickupSubtype === "pickup_point") {
    return {
      prefMethod: "pickup" as const,
      prefPickupSubtype: "pickup_point",
      prefPickupId: pickupId || null,
      prefMetroStationId: null,
      prefMetroLine: null,
      prefMeetupZoneId: null,
      prefMeetupAvailability: null,
      prefCustomMeetup: null,
    };
  }
  if (pickupSubtype === "custom_meetup") {
    return {
      prefMethod: "pickup" as const,
      prefPickupSubtype: "custom_meetup",
      prefPickupId: null,
      prefMetroStationId: null,
      prefMetroLine: null,
      prefMeetupZoneId: null,
      prefMeetupAvailability: null,
      prefCustomMeetup: customMeetupRequest.trim() || null,
    };
  }
  const station = getMetroStation(metroStationId);
  return {
    prefMethod: "pickup" as const,
    prefPickupSubtype: "metro_meetup",
    prefPickupId: null,
    prefMetroStationId: metroStationId || null,
    prefMetroLine: metroLineId || station?.line || null,
    prefMeetupZoneId: (station?.area ?? meetupZoneId) || null,
    prefMeetupAvailability: meetupAvailability,
    prefCustomMeetup: null,
  };
}

export type FulfillmentPrefsPayload = ReturnType<typeof buildFulfillmentPreferencesPayload>;

export default function FulfillmentPreferences({
  pickups,
  onChange,
}: {
  pickups: PickupOption[];
  onChange: (payload: FulfillmentPrefsPayload) => void;
}) {
  const { dict, locale } = useI18n();
  const { user } = useAuth();
  const a = dict.account;
  const co = dict.checkout;
  const prefs = user?.preferences;

  const [pickupSubtype, setPickupSubtype] = useState<PickupSubtype>("metro_meetup");
  const [pickupId, setPickupId] = useState(pickups[0]?.id ?? "");
  const [meetupZoneId, setMeetupZoneId] = useState("southwest");
  const [metroLineId, setMetroLineId] = useState("");
  const [metroStationId, setMetroStationId] = useState("");
  const [meetupAvailability, setMeetupAvailability] = useState<MeetupAvailability>("flexible");
  const [customMeetupRequest, setCustomMeetupRequest] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!prefs || loaded) return;
    if (prefs.prefPickupSubtype === "pickup_point") {
      setPickupSubtype("pickup_point");
      if (prefs.prefPickupId && pickups.some((p) => p.id === prefs.prefPickupId)) {
        setPickupId(prefs.prefPickupId);
      }
    } else if (prefs.prefPickupSubtype === "custom_meetup") {
      setPickupSubtype("custom_meetup");
      setCustomMeetupRequest(prefs.prefCustomMeetup ?? "");
    } else if (prefs.prefMetroStationId || prefs.prefPickupSubtype === "metro_meetup") {
      setPickupSubtype("metro_meetup");
      if (prefs.prefMetroStationId) {
        const saved = getMetroStation(prefs.prefMetroStationId);
        if (saved) {
          setMetroStationId(saved.id);
          setMetroLineId(saved.line);
          setMeetupZoneId(saved.area);
        } else {
          setMetroStationId(prefs.prefMetroStationId);
          if (prefs.prefMetroLine) setMetroLineId(prefs.prefMetroLine);
          if (prefs.prefMeetupZoneId) setMeetupZoneId(prefs.prefMeetupZoneId);
        }
      } else if (prefs.prefMeetupZoneId) {
        setMeetupZoneId(prefs.prefMeetupZoneId);
      }
      if (prefs.prefMeetupAvailability) {
        setMeetupAvailability(prefs.prefMeetupAvailability as MeetupAvailability);
      }
    }
    setLoaded(true);
  }, [prefs, loaded, pickups]);

  useEffect(() => {
    if (!pickupId && pickups[0]?.id) setPickupId(pickups[0].id);
  }, [pickupId, pickups]);

  useEffect(() => {
    if (!loaded || metroStationId) return;
    const line = getLinesForArea(meetupZoneId)[0]?.id ?? "";
    const station = getStationsForAreaAndLine(meetupZoneId, line)[0]?.id ?? "";
    if (line) setMetroLineId(line);
    if (station) setMetroStationId(station);
  }, [loaded, meetupZoneId, metroStationId]);

  useEffect(() => {
    if (!loaded) return;
    onChange(
      buildFulfillmentPreferencesPayload(
        pickupSubtype,
        pickupId,
        meetupZoneId,
        metroLineId,
        metroStationId,
        meetupAvailability,
        customMeetupRequest,
      ),
    );
    // onChange is stable from parent useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loaded,
    pickupSubtype,
    pickupId,
    meetupZoneId,
    metroLineId,
    metroStationId,
    meetupAvailability,
    customMeetupRequest,
  ]);

  return (
    <div className="space-y-4 border-t border-line pt-5">
      <div>
        <p className="text-sm font-medium text-cream">{a.fulfillmentTitle}</p>
        <p className="mt-1 text-xs text-muted">{a.fulfillmentHint}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <SubtypeCard
          active={pickupSubtype === "pickup_point"}
          title={co.pickupSubtypePoint}
          desc={a.fulfillmentPickupDesc}
          onClick={() => setPickupSubtype("pickup_point")}
        />
        <SubtypeCard
          active={pickupSubtype === "metro_meetup"}
          title={co.pickupSubtypeMetro}
          desc={a.fulfillmentMetroDesc}
          onClick={() => setPickupSubtype("metro_meetup")}
        />
        <SubtypeCard
          active={pickupSubtype === "custom_meetup"}
          title={co.pickupSubtypeCustom}
          desc={co.pickupSubtypeCustomDesc}
          onClick={() => setPickupSubtype("custom_meetup")}
        />
      </div>

      {pickupSubtype === "metro_meetup" && (
        <div className="space-y-4">
          <MetroMeetupSelector
            areaId={meetupZoneId}
            lineId={metroLineId}
            stationId={metroStationId}
            subtotal={0}
            onAreaChange={setMeetupZoneId}
            onLineChange={setMetroLineId}
            onStationChange={setMetroStationId}
            errors={{}}
          />
          <label className="field">
            <span>{co.meetupAvailability}</span>
            <select
              className="input"
              value={meetupAvailability}
              onChange={(e) => setMeetupAvailability(e.target.value as MeetupAvailability)}
            >
              {MEETUP_AVAILABILITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {t(opt.label, locale)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {pickupSubtype === "custom_meetup" && (
        <label className="field">
          <span>{co.customMeetupLabel}</span>
          <textarea
            className="input min-h-20 resize-y"
            value={customMeetupRequest}
            onChange={(e) => setCustomMeetupRequest(e.target.value)}
            placeholder={co.customMeetupPlaceholder}
          />
          <p className="mt-2 text-xs text-muted">{co.customMeetupFeeNote}</p>
        </label>
      )}

      {pickupSubtype === "pickup_point" && (
        <div className="space-y-3">
          {pickups.length === 0 ? (
            <p className="rounded-lg border border-line bg-ink-soft/40 p-3 text-xs text-bone">
              {a.fulfillmentPickupEmpty}
            </p>
          ) : (
            <>
              <label className="field">
                <span>{a.fulfillmentPickupLabel}</span>
                <select className="input" value={pickupId} onChange={(e) => setPickupId(e.target.value)}>
                  {pickups.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.neighborhood}
                    </option>
                  ))}
                </select>
              </label>
              {pickups.find((p) => p.id === pickupId) && (
                <p className="text-sm text-bone">
                  {formatWeeklyHoursSummary(pickups.find((p) => p.id === pickupId)!.hours, locale)}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SubtypeCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition ${
        active ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"
      }`}
    >
      <span className="font-semibold text-cream">{title}</span>
      <p className="mt-1 text-xs text-bone">{desc}</p>
    </button>
  );
}
