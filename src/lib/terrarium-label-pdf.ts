import fs from "fs/promises";
import path from "path";
import {
  PDFDocument,
  PDFName,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { buildLabelFacts } from "@/lib/specimen-label-care";
import { toPdfText } from "@/lib/pdf-text";
import { terrariumLabelQrPng, type TerrariumLabelRecord } from "@/lib/data/terrarium-labels";

/** 72 pt per inch — exact conversion for print dimensions. */
const PT = 72 / 25.4;
const mm = (value: number) => value * PT;
const cm = (value: number) => mm(value * 10);

/** US Letter — matches default North American printers (A4 PDF gets bottom-clipped on Letter). */
const PAGE_W = 612;
const PAGE_H = 792;

const LABEL_W = cm(6);
const LABEL_H = cm(4);
const COLS = 3;
const ROWS = 6;
const PER_PAGE = COLS * ROWS;
const GAP_X = mm(5);
const GAP_Y = mm(3);

const GRID_W = COLS * LABEL_W + (COLS - 1) * GAP_X;
const GRID_H = ROWS * LABEL_H + (ROWS - 1) * GAP_Y;
const GRID_X = (PAGE_W - GRID_W) / 2;
/** Top edge of the label grid in PDF coordinates (origin bottom-left). */
const GRID_TOP = (PAGE_H + GRID_H) / 2;

const BAR_H = mm(1.8);
const PAD_X = mm(1.8);
const PAD_Y = mm(1.4);
const COL_GAP = mm(1.5);
const LOGO = mm(5.5);
const QR = mm(13);
const FACT_LABEL_W = mm(7.5);
const FACT_SIZE = 4.75;
const FACT_LABEL_SIZE = 4.5;
const FACT_ROW_H = mm(1.3);

const GOLD = rgb(201 / 255, 162 / 255, 75 / 255);
const GOLD_DEEP = rgb(156 / 255, 122 / 255, 50 / 255);
const INK = rgb(10 / 255, 10 / 255, 12 / 255);
const MUTED = rgb(68 / 255, 68 / 255, 68 / 255);
const LABEL_MUTED = rgb(136 / 255, 136 / 255, 136 / 255);
const LINE = rgb(232 / 255, 223 / 255, 200 / 255);

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const safe = toPdfText(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let out = safe;
  const suffix = "...";
  while (out.length > 1 && font.widthOfTextAtSize(`${out}${suffix}`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}${suffix}`;
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

function slotOnPage(index: number): number {
  return index % PER_PAGE;
}

function slotPosition(slot: number): { x: number; bottomY: number } {
  const col = slot % COLS;
  const row = Math.floor(slot / COLS);
  return {
    x: GRID_X + col * (LABEL_W + GAP_X),
    bottomY: GRID_TOP - (row + 1) * LABEL_H - row * GAP_Y,
  };
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
  return y - FACT_ROW_H;
}

function drawLabel(
  page: PDFPage,
  label: TerrariumLabelRecord,
  slot: number,
  logo: PDFImage,
  qr: PDFImage,
  fonts: {
    scientific: PDFFont;
    body: PDFFont;
    bodyBold: PDFFont;
  },
) {
  const { x, bottomY } = slotPosition(slot);
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

  const footerTop = bodyBottom + mm(5.5);
  textY -= mm(1.5);
  for (const fact of buildLabelFacts(label)) {
    if (textY < footerTop) break;
    textY = drawFactRow(page, leftX, leftW, textY, fact.label, fact.value, fonts);
  }

  if (label.tarantulAppId) {
    drawLeft(page, label.tarantulAppId, leftX, bodyBottom + mm(2.3), leftW, fonts.body, 4.5, LABEL_MUTED);
  }
  drawLeft(page, "montrealspider.ca", leftX, bodyBottom, leftW, fonts.body, 4.5, GOLD_DEEP);
}

function setPrintPreferences(pdf: PDFDocument) {
  const catalog = pdf.catalog;
  catalog.set(
    PDFName.of("ViewerPreferences"),
    pdf.context.obj({
      PrintScaling: PDFName.of("None"),
      FitWindow: false,
    }),
  );
}

/** Build a US Letter PDF with 6 × 4 cm terrarium labels (3 columns × 6 rows per page). */
export async function buildTerrariumLabelsPdf(labels: TerrariumLabelRecord[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Montreal Spider Co - Terrarium Labels");
  pdf.setCreator("Montreal Spider Co");
  setPrintPreferences(pdf);

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
      x: GRID_X,
      y: PAGE_H / 2,
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
    const pageIndex = Math.floor(index / PER_PAGE);
    const slot = slotOnPage(index);
    const qr = qrCache.get(label.qrUrl)!;
    drawLabel(pages[pageIndex], label, slot, logo, qr, fonts);
  }

  return pdf.save();
}
