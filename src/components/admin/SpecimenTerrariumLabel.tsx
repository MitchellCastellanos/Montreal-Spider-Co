import {
  formatCareTags,
  formatClimate,
  formatSpecimenMeta,
  shortOrigin,
} from "@/lib/specimen-label-care";
import type { Experience, SpecimenSex, SpiderType, Temperament } from "@/lib/types";

export type SpecimenTerrariumLabelProps = {
  scientific: string;
  commonName: string;
  sizeLabel: string;
  sex: SpecimenSex;
  type: SpiderType;
  temperament: Temperament;
  experience: Experience;
  humidity: string;
  temperature: string;
  originEn: string;
  tarantulAppId: string | null;
  qrDataUrl: string;
};

/** 6 cm × 4 cm terrarium label — logo top, care info center, compact QR bottom. */
export default function SpecimenTerrariumLabel({
  scientific,
  commonName,
  sizeLabel,
  sex,
  type,
  temperament,
  experience,
  humidity,
  temperature,
  originEn,
  tarantulAppId,
  qrDataUrl,
}: SpecimenTerrariumLabelProps) {
  const careTags = formatCareTags({ type, temperament, experience });
  const climate = formatClimate(humidity, temperature);
  const origin = shortOrigin(originEn);

  return (
    <article className="specimen-terrarium-label">
      <div className="specimen-terrarium-label__bar" aria-hidden />

      <div className="specimen-terrarium-label__body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="" className="specimen-terrarium-label__top-logo" />

        <div className="specimen-terrarium-label__identity">
          <p className="specimen-terrarium-label__scientific">{scientific}</p>
          <p className="specimen-terrarium-label__common">{commonName}</p>
          <p className="specimen-terrarium-label__meta">{formatSpecimenMeta(sizeLabel, sex)}</p>
        </div>

        <div className="specimen-terrarium-label__care">
          <p className="specimen-terrarium-label__care-line">{careTags}</p>
          {climate && <p className="specimen-terrarium-label__care-line">{climate}</p>}
          {origin && <p className="specimen-terrarium-label__care-line">{origin}</p>}
        </div>

        <footer className="specimen-terrarium-label__footer">
          <div className="specimen-terrarium-label__footer-left">
            {tarantulAppId && (
              <p className="specimen-terrarium-label__verified">{tarantulAppId}</p>
            )}
            <p className="specimen-terrarium-label__url">montrealspider.ca</p>
          </div>

          <div className="specimen-terrarium-label__qr-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="" className="specimen-terrarium-label__qr" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png"
              alt=""
              className="specimen-terrarium-label__qr-logo"
              aria-hidden
            />
          </div>
        </footer>
      </div>
    </article>
  );
}
