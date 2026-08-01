import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import {
  formatCareTags,
  formatClimate,
  formatSpecimenMeta,
  shortOrigin,
} from "@/lib/specimen-label-care";
import { terrariumLabelQrPng, type TerrariumLabelRecord } from "@/lib/data/terrarium-labels";

const PT = 72 / 25.4; // points per mm
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
const PAD_X = mm(2.2);
const PAD_Y = mm(1.4);
const LOGO = mm(7);
const QR = mm(12.5);

const GOLD = rgb(201 / 255, 162 / 255, 75 / 255);
const GOLD_DEEP = rgb(156 / 255, 122 / 255, 50 / 255);
const INK = rgb(10 / 255, 10 / 255, 12 / 255);
const MUTED = rgb(68 / 255, 68 / 255, 68 / 255);
const LINE = rgb(232 / 255, 223 / 255, 200 / 255);

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function drawCentered(
  page: PDFPage,
  text: string,
  x: number,
  width: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  const clipped = truncateToWidth(text, font, size, width);
  const textW = font.widthOfTextAtSize(clipped, size);
  page.drawText(clipped, {
    x: x + (width - textW) / 2,
    y,
    size,
    font,
    color,
  });
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

async function drawLabel(
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
  const contentW = LABEL_W - PAD_X * 2;
  const contentX = x + PAD_X;

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

  let cursorY = topY - BAR_H - PAD_Y - LOGO;
  page.drawImage(logo, {
    x: x + (LABEL_W - LOGO) / 2,
    y: cursorY,
    width: LOGO,
    height: LOGO,
  });

  cursorY -= mm(1.2);
  drawCentered(page, label.scientific, contentX, contentW, cursorY, fonts.scientific, 6.5, INK);
  cursorY -= mm(2.4);
  drawCentered(page, label.commonName, contentX, contentW, cursorY, fonts.body, 5.5, MUTED);
  cursorY -= mm(2.6);
  drawCentered(
    page,
    formatSpecimenMeta(label.sizeLabel, label.sex),
    contentX,
    contentW,
    cursorY,
    fonts.bodyBold,
    5.5,
    INK,
  );

  cursorY -= mm(2.2);
  page.drawLine({
    start: { x: contentX, y: cursorY },
    end: { x: contentX + contentW, y: cursorY },
    thickness: mm(0.15),
    color: LINE,
  });

  const careTags = formatCareTags(label);
  const climate = formatClimate(label.humidity, label.temperature);
  const origin = shortOrigin(label.originEn);
  const careLines = [careTags, climate, origin].filter(Boolean) as string[];

  cursorY -= mm(2);
  for (const line of careLines) {
    drawCentered(page, line, contentX, contentW, cursorY, fonts.body, 5, MUTED);
    cursorY -= mm(1.8);
  }

  const qrX = x + LABEL_W - PAD_X - QR;
  const qrY = bottomY + PAD_Y;
  page.drawImage(qr, { x: qrX, y: qrY, width: QR, height: QR });

  const logoOnQr = mm(3.2);
  page.drawImage(logo, {
    x: qrX + (QR - logoOnQr) / 2,
    y: qrY + (QR - logoOnQr) / 2,
    width: logoOnQr,
    height: logoOnQr,
  });

  const footerX = contentX;
  let footerY = bottomY + PAD_Y;
  if (label.tarantulAppId) {
    page.drawText(truncateToWidth(label.tarantulAppId, fonts.body, 4.5, contentW - QR - mm(2)), {
      x: footerX,
      y: footerY + mm(2.2),
      size: 4.5,
      font: fonts.body,
      color: MUTED,
    });
  }
  page.drawText("montrealspider.ca", {
    x: footerX,
    y: footerY,
    size: 4.5,
    font: fonts.body,
    color: GOLD_DEEP,
  });
}

/** Build an A4 PDF with 6 × 4 cm terrarium labels (3 columns × 6 rows per page). */
export async function buildTerrariumLabelsPdf(labels: TerrariumLabelRecord[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const logoBytes = await fs.readFile(path.join(process.cwd(), "public/brand/logo.png"));
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
