import "server-only";
import crypto from "node:crypto";
import type { Conversation } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { uniqueReferralCode } from "@/lib/account/referral";

/**
 * Links (or silently creates) the Customer record for a chat visitor's name/email,
 * and attaches the conversation to it. A silently-created account has no password
 * the visitor knows — if they ever want to log in, "forgot password" gets them in.
 */
export async function identifyVisitor(
  visitorId: string,
  locale: string,
  name: string,
  email: string,
): Promise<Conversation | null> {
  if (!prisma) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  let customer = await prisma.customer.findUnique({ where: { email: normalizedEmail } });
  if (!customer) {
    const passwordHash = await hashPassword(crypto.randomBytes(24).toString("hex"));
    const referralCode = await uniqueReferralCode();
    customer = await prisma.customer.create({
      data: { email: normalizedEmail, passwordHash, name: trimmedName || normalizedEmail.split("@")[0], referralCode },
    });
  }

  const existing = await prisma.conversation.findUnique({ where: { visitorId } });
  if (existing) {
    return prisma.conversation.update({
      where: { id: existing.id },
      data: { name: trimmedName, email: normalizedEmail, customerId: customer.id },
    });
  }
  return prisma.conversation.create({
    data: { visitorId, locale, name: trimmedName, email: normalizedEmail, customerId: customer.id },
  });
}
