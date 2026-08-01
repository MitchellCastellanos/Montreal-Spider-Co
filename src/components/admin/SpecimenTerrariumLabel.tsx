import { buildLabelFacts } from "@/lib/specimen-label-care";
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
  adultSizeEn: string;
  tarantulAppId: string | null;
  qrDataUrl: string;
};

/** 6 cm × 4 cm terrarium label — listed facts left, QR right. */
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
  adultSizeEn,
  tarantulAppId,
  qrDataUrl,
}: SpecimenTerrariumLabelProps) {
  const facts = buildLabelFacts({
    sizeLabel,
    sex,
    adultSizeEn,
    type,
    temperament,
    experience,
    humidity,
    temperature,
    originEn,
  });

  return (
    <article className="specimen-terrarium-label">
      <div className="specimen-terrarium-label__bar" aria-hidden />

      <div className="specimen-terrarium-label__body">
        <div className="specimen-terrarium-label__columns">
          <div className="specimen-terrarium-label__left">
            <div className="specimen-terrarium-label__title-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-bw.png" alt="" className="specimen-terrarium-label__mini-logo" />

              <div className="specimen-terrarium-label__identity">
                <p className="specimen-terrarium-label__scientific">{scientific}</p>
                <p className="specimen-terrarium-label__common">{commonName}</p>
              </div>
            </div>

            <dl className="specimen-terrarium-label__facts">
              {facts.map((fact) => (
                <div key={fact.label} className="specimen-terrarium-label__fact">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div className="specimen-terrarium-label__site">
              {tarantulAppId && (
                <p className="specimen-terrarium-label__verified">{tarantulAppId}</p>
              )}
              <p className="specimen-terrarium-label__url">montrealspider.ca</p>
            </div>
          </div>

          <div className="specimen-terrarium-label__qr-col">
            <div className="specimen-terrarium-label__qr-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="" className="specimen-terrarium-label__qr" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-bw.png"
                alt=""
                className="specimen-terrarium-label__qr-logo"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
