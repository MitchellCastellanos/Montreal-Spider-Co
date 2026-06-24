import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerIdFromSession } from "@/lib/customer-auth";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ orderNumber: string }> };

export async function GET(_req: Request, { params }: Params) {
  const customerId = await getCustomerIdFromSession();
  if (!customerId || !prisma) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { orderNumber } = await params;
  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId },
    include: {
      lines: true,
      specimens: { select: { tarantulAppId: true, sizeCm: true, sex: true } },
    },
  });
  if (!order) return new NextResponse("Not found", { status: 404 });

  const specimens = order.specimens
    .map((s) => s.tarantulAppId)
    .filter(Boolean) as string[];

  const html = `<!DOCTYPE html>
<html lang="${order.locale}">
<head>
  <meta charset="utf-8" />
  <title>Verified Origin — ${order.orderNumber}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 640px; margin: 2rem auto; padding: 2rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .badge { display: inline-block; background: #c9a24b; color: #111; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
    .meta { color: #555; font-size: 0.9rem; margin: 1rem 0 2rem; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; font-size: 0.9rem; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #666; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <span class="badge">TarantulApp · Verified Origin</span>
  <h1>${SITE.name}</h1>
  <p class="meta">Order <strong>${order.orderNumber}</strong> · ${new Date(order.createdAt).toLocaleDateString(order.locale === "fr" ? "fr-CA" : "en-CA")}</p>
  <p>Customer: <strong>${order.name}</strong></p>
  <table>
    <thead><tr><th>Species</th><th>Size</th><th>Qty</th><th>Verified ID</th></tr></thead>
    <tbody>
      ${order.lines
        .map(
          (l) =>
            `<tr><td>${l.nameEn}</td><td>${l.sizeLabelEn}</td><td>${l.qty}</td><td>${specimens.shift() ?? "Pending registration"}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>
  <p>Each specimen is captive-bred and traceable through the TarantulApp Verified Origin registry. Register your spider in TarantulApp using the certificate ID from your order confirmation.</p>
  <p class="footer">${SITE.url} · ${SITE.name}</p>
  <script>window.onload = () => { if (new URLSearchParams(location.search).get('print') === '1') window.print(); };</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
