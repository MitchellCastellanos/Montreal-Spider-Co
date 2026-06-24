import "server-only";
import { prisma } from "@/lib/db";
import { getProductById } from "@/lib/data/products";
import { countPurchasableStock } from "@/lib/data/specimens";
import { emailConfigured } from "@/lib/email";
import { SITE } from "@/lib/site";

async function sendStockAlertEmail(to: string, subject: string, body: string): Promise<void> {
  if (!emailConfigured) {
    console.info("[stock-alerts] skipping email to", to, "—", subject);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? `orders@${new URL(SITE.url).hostname}`;
  await resend.emails.send({ from, to, subject, text: body, html: `<p>${body.replace(/\n/g, "<br>")}</p>` });
}

/** Notify wishlist customers when a product/unit is back in stock. */
export async function processWishlistStockAlerts(productId: string): Promise<void> {
  if (!prisma) return;

  const items = await prisma.wishlistItem.findMany({
    where: { productId, notifyStock: true },
    include: { customer: { select: { id: true, email: true, notifyStock: true } } },
  });
  if (!items.length) return;

  const product = await getProductById(productId);
  if (!product) return;

  for (const item of items) {
    if (!item.customer.notifyStock) continue;

    const unit = item.unitKey
      ? product.availability.find((u) => u.key === item.unitKey)
      : product.availability.find((u) => u.stock > 0);

    if (!unit) continue;

    let stock = unit.stock;
    try {
      stock = await countPurchasableStock(product.id, unit.sizeCm, unit.sex, unit.price);
    } catch {
      /* use catalog stock */
    }
    if (stock <= 0) continue;

    const name = product.common.en || product.scientific;
    const url = `${SITE.url}/en/product/${product.slug}`;
    try {
      await sendStockAlertEmail(
        item.customer.email,
        `${name} is back in stock — Montreal Spider Co.`,
        `Hi,\n\n${name} (${unit.sizeLabel}) is back in stock at Montreal Spider Co.\n\nShop now: ${url}\n\n— Montreal Spider Co.`,
      );
      await prisma.wishlistItem.update({
        where: { id: item.id },
        data: { notifyStock: false },
      });
    } catch (e) {
      console.error("[stock-alerts] wishlist email failed:", e);
    }
  }
}

/** Notify customers watching a genus or product for new arrivals. */
export async function processArrivalAlerts(productId: string): Promise<void> {
  if (!prisma) return;

  const product = await getProductById(productId);
  if (!product || !product.newArrival) return;

  const alerts = await prisma.arrivalAlert.findMany({
    where: {
      active: true,
      OR: [{ productId }, { genus: product.genus }],
    },
    include: { customer: { select: { email: true, notifyStock: true } } },
  });

  const url = `${SITE.url}/en/product/${product.slug}`;
  const name = product.common.en || product.scientific;

  for (const alert of alerts) {
    if (!alert.customer.notifyStock) continue;
    try {
      await sendStockAlertEmail(
        alert.customer.email,
        `New arrival: ${name} — Montreal Spider Co.`,
        `Hi,\n\nWe just listed ${name} — a new arrival you asked about.\n\nView it: ${url}\n\n— Montreal Spider Co.`,
      );
      await prisma.arrivalAlert.update({ where: { id: alert.id }, data: { active: false } });
    } catch (e) {
      console.error("[stock-alerts] arrival email failed:", e);
    }
  }
}
