import "server-only";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionCustomer } from "@/lib/customer-auth";

const customerInclude = {
  orders: { include: { lines: true }, orderBy: { createdAt: "desc" as const } },
  addresses: true,
} satisfies Prisma.CustomerInclude;

type CustomerWithRelations = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

function mapCustomerForAdmin(c: CustomerWithRelations) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    city: c.addresses[0]?.city ?? "",
    verified: true,
    orders: c.orders.map((o) => ({
      id: o.orderNumber,
      date: o.createdAt.toISOString().slice(0, 10),
      total: o.total,
      status: o.status,
      items: o.lines.map((l) => `${l.nameEn} — ${l.sizeLabelEn}`),
    })),
  };
}

export async function listCustomers() {
  if (!prisma) return [];
  const customers = await prisma.customer.findMany({
    include: customerInclude,
    orderBy: { name: "asc" },
  });
  return customers.map(mapCustomerForAdmin);
}

export async function searchCustomersByPhone(query: string) {
  if (!prisma) return [];
  const digits = query.replace(/\D/g, "");
  if (digits.length < 3) return [];

  const customers = await prisma.customer.findMany({
    where: {
      phone: { contains: digits },
    },
    include: customerInclude,
    take: 20,
  });

  return customers.map(mapCustomerForAdmin);
}

export async function getAccountSnapshot() {
  const customer = await getSessionCustomer();
  if (!customer) return null;

  const [wishlistCount, alertCount, guideCount, referralCount, coupons, orderExtras] = await Promise.all([
    prisma?.wishlistItem.count({ where: { customerId: customer.id } }) ?? 0,
    prisma?.arrivalAlert.count({ where: { customerId: customer.id, active: true } }) ?? 0,
    prisma?.savedCareGuide.count({ where: { customerId: customer.id } }) ?? 0,
    prisma?.customer.count({ where: { referredById: customer.id } }) ?? 0,
    prisma?.coupon.findMany({
      where: { customerId: customer.id, active: true },
      orderBy: { createdAt: "desc" },
    }) ?? [],
    prisma?.order.findMany({
      where: { customerId: customer.id },
      select: {
        orderNumber: true,
        statusDetail: true,
        couponCode: true,
        discountAmount: true,
        lines: {
          select: {
            productId: true,
            sizeCm: true,
            sex: true,
            unitPrice: true,
            nameEn: true,
            nameFr: true,
            sizeLabelEn: true,
            sizeLabelFr: true,
            qty: true,
          },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }) ?? [],
  ]);

  const orderMap = new Map(orderExtras.map((o) => [o.orderNumber, o]));

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    experience: customer.experience,
    referralCode: customer.referralCode,
    referralCount,
    preferences: {
      prefMethod: customer.prefMethod,
      prefPickupId: customer.prefPickupId,
      prefPickupSubtype: customer.prefPickupSubtype,
      prefMetroStationId: customer.prefMetroStationId,
      prefMetroLine: customer.prefMetroLine,
      prefMeetupZoneId: customer.prefMeetupZoneId,
      prefMeetupAvailability: customer.prefMeetupAvailability,
      prefCustomMeetup: customer.prefCustomMeetup,
      prefOrderNotes: customer.prefOrderNotes,
      notifyStock: customer.notifyStock,
      notifyPromos: customer.notifyPromos,
      notifyCare: customer.notifyCare,
    },
    counts: { wishlist: wishlistCount, alerts: alertCount, guides: guideCount },
    coupons: coupons.map((c) => ({
      code: c.code,
      type: c.type,
      value: c.value,
      expiresAt: c.expiresAt?.toISOString() ?? null,
    })),
    addresses: customer.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      line1: a.line1,
      city: a.city,
      postal: a.postal,
      isDefault: a.isDefault,
    })),
    orders: customer.orders.map((o) => {
      const extra = orderMap.get(o.orderNumber);
      return {
        id: o.orderNumber,
        date: o.createdAt.toISOString(),
        total: o.total,
        status: o.status,
        statusDetail: extra?.statusDetail ?? o.statusDetail ?? "",
        method: o.method,
        discountAmount: extra?.discountAmount ?? o.discountAmount ?? 0,
        couponCode: extra?.couponCode ?? o.couponCode ?? null,
        items: o.lines.map((l) => ({
          productId: l.productId,
          name: l.nameEn,
          size: l.sizeLabelEn,
          sizeCm: l.sizeCm,
          sex: l.sex,
          unitKey: l.sizeCm != null && l.sex ? `${l.sizeCm}:${l.sex}:${l.unitPrice}` : null,
          qty: l.qty,
          price: l.unitPrice,
        })),
        messages: (extra?.messages ?? []).map((m) => ({
          id: m.id,
          author: m.author,
          body: m.body,
          date: m.createdAt.toISOString(),
        })),
      };
    }),
  };
}
