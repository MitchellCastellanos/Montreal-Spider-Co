import "server-only";
import { prisma } from "@/lib/db";
import { getSessionCustomer } from "@/lib/customer-auth";

export async function searchCustomersByPhone(query: string) {
  if (!prisma) return [];
  const digits = query.replace(/\D/g, "");
  if (digits.length < 3) return [];

  const customers = await prisma.customer.findMany({
    where: {
      phone: { contains: digits },
    },
    include: {
      orders: { include: { lines: true }, orderBy: { createdAt: "desc" } },
      addresses: true,
    },
    take: 20,
  });

  return customers.map((c) => ({
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
  }));
}

export async function getAccountSnapshot() {
  const customer = await getSessionCustomer();
  if (!customer) return null;

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    addresses: customer.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      line1: a.line1,
      city: a.city,
      postal: a.postal,
      isDefault: a.isDefault,
    })),
    orders: customer.orders.map((o) => ({
      id: o.orderNumber,
      date: o.createdAt.toISOString(),
      total: o.total,
      status: o.status,
      method: o.method,
      items: o.lines.map((l) => ({
        name: l.nameEn,
        size: l.sizeLabelEn,
        qty: l.qty,
        price: l.unitPrice,
      })),
    })),
  };
}
