import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import { buildLabelFacts } from "@/lib/specimen-label-care";
import { terrariumLabelQrPng, type TerrariumLabelRecord } from "@/lib/data/terrarium-labels";

const PT = 72 / 25.4;
const mm = (value: number) => value * PT;
const cm = (value: number) => mm(value * 10);

const LABEL_W = cm(6);
const LABEL_H = cm(4);
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = mm(5);
const GAP_X = mm(5);
const GAP_Y = mm(3);
const COLS = 3;
const ROWS = 6;
const PER_PAGE = COLS * ROWS;

const BAR_H = mm(1.8);
const PAD_X = mm(1.8);
const PAD_Y = mm(1.4);
const COL_GAP = mm(1.5);
const LOGO = mm(5.5);
const QR = mm(13);
const FACT_LABEL_W = mm(7.5);
const FACT_SIZE = 4.75;
const FACT_LABEL_SIZE = 4.5;

const GOLD = rgb(201 / 255, 162 / 255, 75 / 255);
const GOLD_DEEP = rgb(156 / 255, 122 / 255, 50 / 255);
const INK = rgb(10 / 255, 10 / 255, 12 / 255);
const MUTED = rgb(68 / 255, 68 / 255, 68 / 255);
const LABEL_MUTED = rgb(136 / 255, 136 / 255, 136 / 255);
const LINE = rgb(232 / 255, 223 / 255, 200 / 255);

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function drawLeft(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawText(truncateToWidth(text, font, size, maxWidth), {
    x,
    y,
    size,
    font,
    color,
  });
}

function drawFactRow(
  page: PDFPage,
  leftX: number,
  leftW: number,
  y: number,
  label: string,
  value: string,
  fonts: { body: PDFFont; bodyBold: PDFFont },
): number {
  drawLeft(page, label.toUpperCase(), leftX, y, FACT_LABEL_W, fonts.bodyBold, FACT_LABEL_SIZE, LABEL_MUTED);
  drawLeft(
    page,
    value,
    leftX + FACT_LABEL_W + mm(0.4),
    y,
    leftW - FACT_LABEL_W - mm(0.4),
    fonts.body,
    FACT_SIZE,
    MUTED,
  );
  return y - mm(1.3);
}

function labelOrigin(index: number): { page: number; col: number; row: number } {
  const page = Math.floor(index / PER_PAGE);
  const onPage = index % PER_PAGE;
  return { page, col: onPage % COLS, row: Math.floor(onPage / COLS) };
}

function labelBox(index: number): { x: number; bottomY: number } {
  const { col, row } = labelOrigin(index);
  const x = MARGIN + col * (LABEL_W + GAP_X);
  const bottomY = PAGE_H - MARGIN - (row + 1) * LABEL_H - row * GAP_Y;
  return { x, bottomY };
}

function drawLabel(
  page: PDFPage,
  label: TerrariumLabelRecord,
  index: number,
  logo: PDFImage,
  qr: PDFImage,
  fonts: {
    scientific: PDFFont;
    body: PDFFont;
    bodyBold: PDFFont;
  },
) {
  const { x, bottomY } = labelBox(index);
  const topY = bottomY + LABEL_H;
  const bodyTop = topY - BAR_H - PAD_Y;
  const bodyBottom = bottomY + PAD_Y;
  const bodyH = bodyTop - bodyBottom;

  page.drawRectangle({
    x,
    y: bottomY,
    width: LABEL_W,
    height: LABEL_H,
    color: rgb(1, 1, 1),
    borderColor: GOLD,
    borderWidth: mm(0.2),
  });

  page.drawRectangle({
    x,
    y: topY - BAR_H,
    width: LABEL_W,
    height: BAR_H,
    color: GOLD,
  });

  const qrX = x + LABEL_W - PAD_X - QR;
  const qrY = bodyBottom + (bodyH - QR) / 2;
  page.drawImage(qr, { x: qrX, y: qrY, width: QR, height: QR });

  const logoOnQr = mm(3.2);
  page.drawImage(logo, {
    x: qrX + (QR - logoOnQr) / 2,
    y: qrY + (QR - logoOnQr) / 2,
    width: logoOnQr,
    height: logoOnQr,
  });

  const leftX = x + PAD_X;
  const leftW = LABEL_W - PAD_X * 2 - QR - COL_GAP;
  const textX = leftX + LOGO + mm(1);
  const textW = leftW - LOGO - mm(1);

  page.drawImage(logo, {
    x: leftX,
    y: bodyTop - LOGO,
    width: LOGO,
    height: LOGO,
  });

  let textY = bodyTop - mm(1.4);
  drawLeft(page, label.scientific, textX, textY, textW, fonts.scientific, 6.5, INK);
  textY -= mm(2);
  drawLeft(page, label.commonName, textX, textY, textW, fonts.body, 5.5, MUTED);

  textY -= mm(1.4);
  page.drawLine({
    start: { x: leftX, y: textY },
    end: { x: leftX + leftW, y: textY },
    thickness: mm(0.15),
    color: LINE,
  });

  textY -= mm(1.5);
  for (const fact of buildLabelFacts(label)) {
    textY = drawFactRow(page, leftX, leftW, textY, fact.label, fact.value, fonts);
  }

  if (label.tarantulAppId) {
    drawLeft(page, label.tarantulAppId, leftX, bodyBottom + mm(2.3), leftW, fonts.body, 4.5, LABEL_MUTED);
  }
  drawLeft(page, "montrealspider.ca", leftX, bodyBottom, leftW, fonts.body, 4.5, GOLD_DEEP);
}

/** Build an A4 PDF with 6 × 4 cm terrarium labels (3 columns × 6 rows per page). */
export async function buildTerrariumLabelsPdf(labels: TerrariumLabelRecord[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const logoBytes = await fs.readFile(path.join(process.cwd(), "public/brand/logo-bw.png"));
  const logo = await pdf.embedPng(logoBytes);

  const scientific = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bodyBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts = { scientific, body, bodyBold };

  const pageCount = Math.max(1, Math.ceil(labels.length / PER_PAGE));
  const pages: PDFPage[] = [];
  for (let i = 0; i < pageCount; i++) {
    pages.push(pdf.addPage([PAGE_W, PAGE_H]));
  }

  if (labels.length === 0) {
    pages[0].drawText("No specimens match this filter.", {
      x: MARGIN,
      y: PAGE_H - MARGIN - 20,
      size: 12,
      font: body,
      color: MUTED,
    });
    return pdf.save();
  }

  const qrCache = new Map<string, PDFImage>();
  for (const label of labels) {
    if (!qrCache.has(label.qrUrl)) {
      const png = await terrariumLabelQrPng(label.qrUrl);
      qrCache.set(label.qrUrl, await pdf.embedPng(png));
    }
  }

  for (let index = 0; index < labels.length; index++) {
    const label = labels[index];
    const { page: pageIndex } = labelOrigin(index);
    const qr = qrCache.get(label.qrUrl)!;
    drawLabel(pages[pageIndex], label, index, logo, qr, fonts);
  }

  return pdf.save();
}
