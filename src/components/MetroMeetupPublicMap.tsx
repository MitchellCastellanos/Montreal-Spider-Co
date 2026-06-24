"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { MetroStation } from "@/lib/metro-meetup";
import MetroMeetupMap from "@/components/MetroMeetupMap";

/** Explorable metro map for public marketing pages (delivery, pickup-points). */
export default function MetroMeetupPublicMap() {
  const { dict } = useI18n();
  const [previewStationId, setPreviewStationId] = useState<string | undefined>();

  const handleSelect = (station: MetroStation) => {
    setPreviewStationId(station.id);
  };

  return (
    <div className="space-y-2">
      <MetroMeetupMap
        selectedStationId={previewStationId}
        onSelectStation={handleSelect}
        subtotal={0}
      />
      <p className="text-xs text-muted">{dict.delivery.metroMapExplore}</p>
    </div>
  );
}
