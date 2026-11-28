import "server-only";
import { prisma } from "@/lib/db";

function generateOrderNumber(): string {
  return `MSC-${Math.floor(1000 + Math.random() * 9000)}`;
}

/** A free order number (best effort: 5 tries, then the last candidate — the DB unique index is the real guard). */
export async function nextOrderNumber(): Promise<string> {
  let orderNumber = generateOrderNumber();
  if (!prisma) return orderNumber;
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await prisma.order.findUnique({ where: { orderNumber } });
    if (!taken) break;
    orderNumber = generateOrderNumber();
  }
  return orderNumber;
}
