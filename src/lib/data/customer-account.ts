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
