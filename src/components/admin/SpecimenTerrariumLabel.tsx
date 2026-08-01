import type { SpecimenSex } from "@/lib/types";

const SEX_LABEL: Record<SpecimenSex, string> = {
  unsexed: "Unsexed",
  male: "Male",
  female: "Female",
};

export type SpecimenTerrariumLabelProps = {
  scientific: string;
  commonName: string;
  sizeLabel: string;
  sex: SpecimenSex;
  tarantulAppId: string | null;
  qrDataUrl: string;
};

/** 60 × 40 mm terrarium label — white, brand header, compact QR for partner scans. */
export default function SpecimenTerrariumLabel({
  scientific,
  commonName,
  sizeLabel,
  sex,
  tarantulAppId,
  qrDataUrl,
}: SpecimenTerrariumLabelProps) {
  return (
    <article className="specimen-terrarium-label">
      <div className="specimen-terrarium-label__bar" aria-hidden />

      <div className="specimen-terrarium-label__body">
        <div className="specimen-terrarium-label__info">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.png"
            alt=""
            className="specimen-terrarium-label__logo"
          />

          <div className="specimen-terrarium-label__text">
            <p className="specimen-terrarium-label__scientific">{scientific}</p>
            <p className="specimen-terrarium-label__common">{commonName}</p>
            <p className="specimen-terrarium-label__meta">
              {sizeLabel} · {SEX_LABEL[sex]}
            </p>
            {tarantulAppId && (
              <p className="specimen-terrarium-label__verified">{tarantulAppId}</p>
            )}
            <p className="specimen-terrarium-label__url">montrealspider.ca</p>
          </div>
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
      </div>
    </article>
  );
}
