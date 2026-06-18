import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import type { Address, Customer, Order, OrderLine } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";

export { hashPassword, verifyPassword };

const COOKIE = "msc_customer";

export type CustomerOrder = Order & { lines: OrderLine[] };
export type CustomerProfile = Customer & { addresses: Address[]; orders: CustomerOrder[] };

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
  return secret;
}

function sessionToken(customerId: string): string {
  return crypto.createHmac("sha256", signingSecret()).update(`customer:${customerId}`).digest("hex");
}

function encodeCookie(customerId: string): string {
  return `${customerId}.${sessionToken(customerId)}`;
}

function decodeCookie(value: string): string | null {
  const [customerId, sig] = value.split(".");
  if (!customerId || !sig) return null;
  const expected = sessionToken(customerId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return customerId;
}

export async function setCustomerCookie(customerId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encodeCookie(customerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCustomerCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getCustomerIdFromSession(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  if (!value) return null;
  return decodeCookie(value);
}

export async function getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
  if (!prisma) return null;
  return prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
      orders: { include: { lines: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getSessionCustomer(): Promise<CustomerProfile | null> {
  const id = await getCustomerIdFromSession();
  if (!id) return null;
  return getCustomerProfile(id);
}

export async function loginCustomer(email: string, password: string): Promise<CustomerProfile | null> {
  if (!prisma) return null;
  const normalized = email.trim().toLowerCase();
  const customer = await prisma.customer.findUnique({ where: { email: normalized } });
  if (!customer) return null;
  const ok = await verifyPassword(password, customer.passwordHash);
  if (!ok) return null;
  await setCustomerCookie(customer.id);
  return getCustomerProfile(customer.id);
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<{ customer: CustomerProfile } | { error: string }> {
  if (!prisma) return { error: "Database not configured." };
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password || input.password.length < 8) {
    return { error: "Invalid registration details." };
  }
  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists." };

  const passwordHash = await hashPassword(input.password);
  const created = await prisma.customer.create({
    data: {
      email,
      passwordHash,
      name: input.name.trim() || email.split("@")[0],
      phone: input.phone?.trim() ?? "",
    },
  });
  await setCustomerCookie(created.id);
  const customer = await getCustomerProfile(created.id);
  if (!customer) return { error: "Could not create account." };
  return { customer };
}
