import "server-only";
import { prisma } from "@/lib/db";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `MSC-${suffix}`;
}

export async function uniqueReferralCode(): Promise<string> {
  if (!prisma) return generateReferralCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode();
    const taken = await prisma.customer.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  return `MSC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/** Reward referrer with a personal coupon after a referred customer's first order. */
export async function grantReferralReward(referrerId: string): Promise<void> {
  if (!prisma) return;
  const existing = await prisma.coupon.findFirst({
    where: { referrerId, code: { startsWith: "REF-" } },
  });
  if (existing) return;

  const referrer = await prisma.customer.findUnique({ where: { id: referrerId } });
  if (!referrer) return;

  await prisma.coupon.create({
    data: {
      code: `REF-${referrer.referralCode.replace("MSC-", "")}`,
      type: "fixed",
      value: 10,
      customerId: referrerId,
      referrerId,
      maxUses: 1,
      active: true,
    },
  });
}
