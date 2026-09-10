import QRCode from "qrcode";
import type { SpecimenSex } from "@/lib/types";

const INK = "#141c11";
const INK_SOFT = "#1a2417";
const GOLD = "#d8cca6";
const GOLD_BRIGHT = "#f3ecdb";
const GOLD_DEEP = "#a89b74";
const CREAM = "#f3ecdb";
const BONE = "#c7c3ab";

const BRAND_LOGO = "/brand/logo-circle.png";

const SEX_LABEL: Record<SpecimenSex, string> = {
  unsexed: "Unsexed",
  male: "Male",
  female: "Female",
};

export interface AdCardInput {
  scientific: string;
  commonName: string;
  sizeLabel: string;
  sex: SpecimenSex;
  price: number;
  photoUrl?: string | null;
  productUrl: string;
}

function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw <= 0 || ih <= 0) return;
  const ratio = Math.max(dw / iw, dh / ih);
  const cw = iw * ratio;
  const ch = ih * ratio;
  ctx.drawImage(img, dx + (dw - cw) / 2, dy + (dh - ch) / 2, cw, ch);
}

function drawPhotoFallback(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, "#20301a");
  grad.addColorStop(1, INK);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.fillStyle = "rgba(216, 204, 166, 0.16)";
  ctx.font = "320px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🕷️", x + w / 2, y + h / 2);
  ctx.restore();
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawGoldRule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, GOLD_DEEP);
  grad.addColorStop(0.5, GOLD_BRIGHT);
  grad.addColorStop(1, GOLD_DEEP);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const raw = text.trim();
  if (!raw) return [];
  const words = raw.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth) {
      line = trial;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const last = lines[lines.length - 1];
    const ell = "…";
    if (ctx.measureText(last).width > maxWidth - ctx.measureText(ell).width) {
      let trimmed = last;
      while (trimmed.length > 1 && ctx.measureText(trimmed + ell).width > maxWidth) {
        trimmed = trimmed.slice(0, -1);
      }
      lines[lines.length - 1] = trimmed + ell;
    }
  }
  return lines;
}

function formatCardPrice(amount: number): string {
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

/**
 * Renders a 1080×1080 branded thumbnail for a Kijiji / MorphMarket listing:
 * specimen photo, species, size/sex, price, metro-delivery callout and a QR
 * code back to the product page.
 */
export async function buildAdCardPngDataUrl(input: AdCardInput): Promise<string> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  const imgZoneH = Math.round(H * 0.58);
  let photoLoaded = false;
  if (input.photoUrl) {
    try {
      const photo = await loadImage(input.photoUrl, true);
      drawCover(ctx, photo, 0, 0, W, imgZoneH);
      photoLoaded = true;
    } catch {
      photoLoaded = false;
    }
  }
  if (!photoLoaded) drawPhotoFallback(ctx, 0, 0, W, imgZoneH);
  drawGoldRule(ctx, 0, 0, W, 8);

  // Fade seam between photo and panel.
  const fadeH = 130;
  const fade = ctx.createLinearGradient(0, imgZoneH - fadeH, 0, imgZoneH);
  fade.addColorStop(0, "rgba(20, 28, 17, 0)");
  fade.addColorStop(1, "rgba(20, 28, 17, 1)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, imgZoneH - fadeH, W, fadeH);

  // Bottom info panel.
  const panelY = imgZoneH;
  const panelH = H - imgZoneH;
  const panelGrad = ctx.createLinearGradient(0, panelY, 0, H);
  panelGrad.addColorStop(0, INK_SOFT);
  panelGrad.addColorStop(1, INK);
  ctx.fillStyle = panelGrad;
  ctx.fillRect(0, panelY, W, panelH);
  drawGoldRule(ctx, 0, panelY, W, 4);

  const pad = 56;

  // Brand chip: logo + wordmark, top-left of the panel.
  const logoSize = 50;
  const chipY = panelY + 26;
  let cursorX = pad;
  try {
    const logo = await loadImage(BRAND_LOGO);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cursorX + logoSize / 2, chipY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, cursorX, chipY, logoSize, logoSize);
    ctx.restore();
    cursorX += logoSize + 14;
  } catch {
    /* logo optional */
  }
  ctx.fillStyle = CREAM;
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Montreal Spider Co.", cursorX, chipY + logoSize / 2);
  ctx.textBaseline = "top";

  // "For sale" eyebrow pill, top-right.
  const pillText = "FOR SALE";
  ctx.font = "bold 16px sans-serif";
  const pillW = ctx.measureText(pillText).width + 30;
  ctx.fillStyle = "rgba(216, 204, 166, 0.16)";
  ctx.strokeStyle = "rgba(216, 204, 166, 0.65)";
  ctx.lineWidth = 1;
  drawRoundRect(ctx, W - pad - pillW, chipY + 4, pillW, 34, 17);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pillText, W - pad - pillW / 2, chipY + 21);
  ctx.textBaseline = "top";

  // QR code, bottom-right, on a white plate.
  const qrSize = 132;
  const qrPad = 12;
  const qrX = W - pad - qrSize;
  const qrY = H - pad - qrSize;
  try {
    const qrDataUrl = await QRCode.toDataURL(input.productUrl, {
      width: qrSize,
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#141c11", light: "#ffffff" },
    });
    const qrImg = await loadImage(qrDataUrl);
    ctx.save();
    ctx.fillStyle = "#ffffff";
    drawRoundRect(ctx, qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 14);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = "rgba(243, 236, 219, 0.7)";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCAN FOR DETAILS", qrX + qrSize / 2, qrY - qrPad - 22);
  } catch {
    /* QR is optional */
  }

  // Left column content stops before the QR code.
  const contentW = qrX - qrPad - pad - 24;

  let cursorY = panelY + 110;

  // Species (scientific, bold serif-esque).
  ctx.fillStyle = CREAM;
  ctx.font = "italic bold 46px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const sciLines = wrapLines(ctx, input.scientific, contentW, 2);
  for (const line of sciLines) {
    ctx.fillText(line, pad, cursorY);
    cursorY += 54;
  }

  // Common name.
  if (input.commonName) {
    ctx.fillStyle = BONE;
    ctx.font = "26px sans-serif";
    const commonLines = wrapLines(ctx, input.commonName, contentW, 1);
    if (commonLines[0]) {
      ctx.fillText(commonLines[0], pad, cursorY + 6);
      cursorY += 42;
    }
  }

  cursorY += 18;

  // Size / sex badge row.
  const badgeText = `${input.sizeLabel}  ·  ${SEX_LABEL[input.sex]}`;
  ctx.font = "bold 24px sans-serif";
  const badgeW = ctx.measureText(badgeText).width + 34;
  ctx.fillStyle = "rgba(216, 204, 166, 0.12)";
  ctx.strokeStyle = "rgba(216, 204, 166, 0.4)";
  drawRoundRect(ctx, pad, cursorY, badgeW, 46, 23);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, pad + 17, cursorY + 23);
  ctx.textBaseline = "top";
  cursorY += 46 + 30;

  // Price.
  ctx.fillStyle = GOLD;
  ctx.font = "bold 72px sans-serif";
  ctx.fillText(formatCardPrice(input.price), pad, cursorY);
  cursorY += 92;

  // Metro delivery callout.
  ctx.fillStyle = "rgba(243, 236, 219, 0.85)";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("🚇 Delivered to Montreal metro stations", pad, cursorY);
  cursorY += 34;
  ctx.fillStyle = "rgba(199, 195, 171, 0.75)";
  ctx.font = "20px sans-serif";
  ctx.fillText("Pickup also available — montrealspider.ca", pad, cursorY);

  return canvas.toDataURL("image/png");
}
