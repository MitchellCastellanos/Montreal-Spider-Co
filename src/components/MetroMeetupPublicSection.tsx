import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { formatPrice } from "@/lib/format";
import {
  MEETUP_AREAS,
  getStationsForArea,
} from "@/lib/metro-meetup";
import { t } from "@/lib/types";

/** Read-only meetup areas, fees, and stations for public marketing pages. */
export default async function MetroMeetupPublicSection({ locale }: { locale: string }) {
  const loc: Locale = isLocale(locale) ? locale : "en";
  const dict = await getDictionary(loc);
  const d = dict.delivery;

  return (
    <div className="card-glow rounded-2xl p-7">
      <h3 className="font-display text-xl font-bold text-cream">{d.metroTitle}</h3>
      <p className="mt-2 text-sm leading-relaxed text-bone">{d.metroBody}</p>

      <div className="mt-5 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-gold-deep">
            <tr>
              <th className="px-4 py-3">{d.zoneCol}</th>
              <th className="px-4 py-3">{d.feeCol}</th>
              <th className="px-4 py-3">{d.metroFreeCol}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {MEETUP_AREAS.map((area) => (
              <tr key={area.id} className="text-bone">
                <td className="px-4 py-3 font-medium text-cream">{t(area.name, loc)}</td>
                <td className="px-4 py-3 text-gold-bright">{formatPrice(area.fee, loc)}</td>
                <td className="px-4 py-3">{formatPrice(area.freeMeetupThreshold, loc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">{d.metroMapNote}</p>

      <div className="mt-6 space-y-4">
        {MEETUP_AREAS.map((area) => {
          const stations = getStationsForArea(area.id);
          const uniqueNames = [...new Set(stations.map((s) => s.name))].sort();
          return (
            <AreaStationList
              key={area.id}
              areaName={t(area.name, loc)}
              fee={formatPrice(area.fee, loc)}
              freeOver={formatPrice(area.freeMeetupThreshold, loc)}
              stationsLabel={d.metroStationsCol}
              freeLabel={d.metroFreeCol}
              stationNames={uniqueNames}
            />
          );
        })}
      </div>
    </div>
  );
}

function AreaStationList({
  areaName,
  fee,
  freeOver,
  stationsLabel,
  freeLabel,
  stationNames,
}: {
  areaName: string;
  fee: string;
  freeOver: string;
  stationsLabel: string;
  freeLabel: string;
  stationNames: string[];
}) {
  return (
    <details className="group rounded-xl border border-line bg-ink-soft/30">
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium text-cream">{areaName}</span>
          <span className="text-xs text-gold-bright">
            {fee} · {freeLabel} {freeOver}
          </span>
        </div>
      </summary>
      <div className="border-t border-line px-4 py-3">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted">{stationsLabel}</p>
        <p className="text-sm leading-relaxed text-bone">{stationNames.join(" · ")}</p>
      </div>
    </details>
  );
}
