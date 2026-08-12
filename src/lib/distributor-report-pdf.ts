import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { toPdfText } from "@/lib/pdf-text";
import { SITE } from "@/lib/site";
import { STATUS_LABELS } from "@/lib/inventory-labels";
import type { DistributorInventoryReport } from "@/lib/data/distributor-report";

/** Simple US Letter tabular report — inventory + pricing + contact info for a distributor. */

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ROW_H = 16;
const TABLE_HEADER_H = 18;
const FOOTER_ZONE = 30;

const GOLD = rgb(201 / 255, 162 / 255, 75 / 255);
const INK = rgb(20 / 255, 17 / 255, 13 / 255);
const MUTED = rgb(120 / 255, 110 / 255, 90 / 255);
const LINE = rgb(225 / 255, 217 / 255, 196 / 255);
const PANEL = rgb(0.97, 0.955, 0.92);

type Col = { label: string; x: number; w: number; align: "left" | "right" };

const COLS: Col[] = [
  { label: "Specimen", x: 0, w: 190, align: "left" },
  { label: "Size", x: 190, w: 55, align: "left" },
  { label: "Sex", x: 245, w: 55, align: "left" },
  { label: "Status", x: 300, w: 80, align: "left" },
  { label: "Recommended", x: 380, w: 68, align: "right" },
  { label: "Distributor", x: 448, w: 68, align: "right" },
];

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const safe = toPdfText(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let out = safe;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) out = out.slice(0, -1);
  return `${out}...`;
}

function label(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  align: "left" | "right" = "left",
  maxWidth?: number,
) {
  const safe = maxWidth ? truncate(text, font, size, maxWidth) : toPdfText(text);
  const width = font.widthOfTextAtSize(safe, size);
  const drawX = align === "right" ? x - width : x;
  page.drawText(safe, { x: drawX, y, size, font, color });
}

function cell(page: PDFPage, col: Col, text: string, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  label(page, text, MARGIN + col.x + (col.align === "right" ? col.w : 0), y, font, size, color, col.align, col.w - 4);
}

export async function buildDistributorInventoryPdf(report: DistributorInventoryReport): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${SITE.name} - Distributor Inventory - ${report.locationName}`);
  pdf.setCreator(SITE.name);

  const logoBytes = await fs.readFile(path.join(process.cwd(), "public/brand/logo-bw.png"));
  const logo = await pdf.embedPng(logoBytes);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const generatedDate = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  const pages: PDFPage[] = [];
  function newPage(): PDFPage {
    const p = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    return p;
  }

  function drawBrandHeader(p: PDFPage) {
    const logoSize = 32;
    p.drawImage(logo, { x: MARGIN, y: PAGE_H - MARGIN - logoSize + 6, width: logoSize, height: logoSize });
    label(p, SITE.name, MARGIN + logoSize + 10, PAGE_H - MARGIN - 6, bold, 14, INK);
    label(p, "Distributor inventory report", MARGIN + logoSize + 10, PAGE_H - MARGIN - 20, body, 9, MUTED);
    label(p, generatedDate, PAGE_W - MARGIN, PAGE_H - MARGIN - 6, body, 9, MUTED, "right");
    p.drawLine({
      start: { x: MARGIN, y: PAGE_H - MARGIN - logoSize },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - MARGIN - logoSize },
      thickness: 1.2,
      color: GOLD,
    });
  }

  function drawTableHeader(p: PDFPage, y: number) {
    p.drawRectangle({ x: MARGIN, y: y - TABLE_HEADER_H + 5, width: CONTENT_W, height: TABLE_HEADER_H, color: PANEL });
    for (const col of COLS) cell(p, col, col.label, y - 8, bold, 7.5, MUTED);
  }

  function drawFooter(p: PDFPage, pageNum: number, pageCount: number) {
    label(p, `${SITE.name} · ${SITE.url.replace(/^https?:\/\//, "")} · ${SITE.email}`, MARGIN, MARGIN - 14, body, 7.5, MUTED);
    label(p, `Page ${pageNum} of ${pageCount}`, PAGE_W - MARGIN, MARGIN - 14, body, 7.5, MUTED, "right");
  }

  // --- Page 1: header, contact block, financial summary ---
  let page = newPage();
  drawBrandHeader(page);

  let y = PAGE_H - MARGIN - 52;
  label(page, report.locationName, MARGIN, y, bold, 16, INK);
  y -= 22;

  const colGap = 24;
  const colW = (CONTENT_W - colGap) / 2;
  const fromX = MARGIN;
  const toX = MARGIN + colW + colGap;
  label(page, "FROM", fromX, y, bold, 7, MUTED);
  label(page, "TO", toX, y, bold, 7, MUTED);
  y -= 12;
  label(page, SITE.name, fromX, y, bold, 9.5, INK, "left", colW);
  label(page, report.locationName, toX, y, bold, 9.5, INK, "left", colW);
  y -= 12;
  label(page, SITE.email, fromX, y, body, 9, MUTED, "left", colW);
  label(page, report.contactName || "No contact name on file", toX, y, body, 9, MUTED, "left", colW);
  y -= 12;
  label(page, SITE.url.replace(/^https?:\/\//, ""), fromX, y, body, 9, MUTED, "left", colW);
  label(page, report.email || "No email on file", toX, y, body, 9, MUTED, "left", colW);
  if (report.phone) {
    y -= 12;
    label(page, report.phone, toX, y, body, 9, MUTED, "left", colW);
  }

  y -= 20;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_W, y }, thickness: 0.75, color: LINE });
  y -= 24;

  const summaryItems: [string, string][] = [
    ["Items on hand", String(report.itemCount)],
    ["Value at recommended price", money(report.totalRecommendedValue)],
    ["Owed to MSC if all sold", money(report.totalDistributorValue)],
  ];
  const boxH = 40;
  const summaryTop = y;
  page.drawRectangle({
    x: MARGIN,
    y: summaryTop - boxH,
    width: CONTENT_W,
    height: boxH,
    borderColor: LINE,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  const boxColW = CONTENT_W / summaryItems.length;
  summaryItems.forEach(([lab, val], i) => {
    const bx = MARGIN + 14 + i * boxColW;
    const by = summaryTop - 16;
    label(page, lab.toUpperCase(), bx, by, bold, 6.5, MUTED, "left", boxColW - 20);
    label(page, val, bx, by - 17, bold, 13, INK);
  });
  y = summaryTop - boxH - 22;

  drawTableHeader(page, y);
  y -= TABLE_HEADER_H;

  if (report.items.length === 0) {
    label(page, "Nothing currently on hand at this distributor.", MARGIN, y - 14, body, 9, MUTED);
  }

  const tableBottom = MARGIN + FOOTER_ZONE;
  for (const item of report.items) {
    if (y - ROW_H < tableBottom) {
      page = newPage();
      drawBrandHeader(page);
      let y2 = PAGE_H - MARGIN - 52;
      label(page, `${report.locationName} — continued`, MARGIN, y2, bold, 12, INK);
      y2 -= 22;
      drawTableHeader(page, y2);
      y = y2 - TABLE_HEADER_H;
    }
    y -= ROW_H;
    cell(page, COLS[0], item.scientific, y + 4, italic, 8.5, INK);
    cell(page, COLS[1], item.sizeLabel, y + 4, body, 8.5, INK);
    cell(page, COLS[2], item.sex, y + 4, body, 8.5, INK);
    cell(page, COLS[3], STATUS_LABELS[item.status] ?? item.status, y + 4, body, 8, MUTED);
    cell(page, COLS[4], money(item.recommendedPrice), y + 4, body, 8.5, INK);
    cell(page, COLS[5], money(item.distributorPrice), y + 4, bold, 8.5, INK);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_W, y }, thickness: 0.5, color: LINE });
  }

  const pageCount = pages.length;
  pages.forEach((p, idx) => drawFooter(p, idx + 1, pageCount));

  return pdf.save();
}
