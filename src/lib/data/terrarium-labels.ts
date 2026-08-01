import QRCode from "qrcode";
import { hasDatabase, prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { formatCmAsInches } from "@/lib/size-inches";
import type { Experience, SpecimenSex, SpiderType, Temperament } from "@/lib/types";

export type TerrariumLabelRecord = {
  id: string;
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
  qrUrl: string;
};

const QR_OPTS = {
  margin: 0,
  width: 140,
  errorCorrectionLevel: "H" as const,
  color: { dark: "#0a0a0c", light: "#ffffff" },
} as const;

/** Specimens eligible for terrarium labels, optionally filtered by location and/or ids. */
export async function fetchTerrariumLabels(options?: {
  locationFilter?: string;
  ids?: string[];
}): Promise<TerrariumLabelRecord[]> {
  if (!hasDatabase || !prisma) return [];

  const locationFilter = options?.locationFilter;
  const ids = options?.ids?.filter(Boolean);

  const specimens = await prisma.specimen.findMany({
    where: {
      status: { in: ["available", "consignment", "allocated"] },
      ...(ids?.length ? { id: { in: ids } } : {}),
      ...(locationFilter === "warehouse"
        ? { locationType: "warehouse" }
        : locationFilter
          ? { locationId: locationFilter }
          : {}),
    },
    include: {
      product: {
        select: {
          scientific: true,
          commonEn: true,
          type: true,
          temperament: true,
          experience: true,
          humidity: true,
          temperature: true,
          originEn: true,
        },
      },
    },
    orderBy: { purchasedAt: "asc" },
    take: 200,
  });

  const records = specimens.map((s) => ({
    id: s.id,
    scientific: s.product.scientific,
    commonName: s.product.commonEn,
    sizeLabel: formatCmAsInches(s.sizeCm),
    sex: s.sex,
    type: s.product.type,
    temperament: s.product.temperament,
    experience: s.product.experience,
    humidity: s.product.humidity,
    temperature: s.product.temperature,
    originEn: s.product.originEn,
    tarantulAppId: s.tarantulAppId,
    qrUrl: `${SITE.url}/q/${s.qrToken}`,
  }));

  if (!ids?.length) return records;

  const byId = new Map(records.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is TerrariumLabelRecord => r != null);
}

export async function terrariumLabelQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...QR_OPTS, type: "png" });
}

export async function terrariumLabelQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, QR_OPTS);
}
