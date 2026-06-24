import "server-only";
import type { Coupon } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface CouponValidation {
  coupon: Coupon;
  discount: number;
}

export async function validateCoupon(
  code: string,
  customerId: string | null,
  subtotal: number,
): Promise<CouponValidation | { error: string }> {
  if (!prisma) return { error: "Database not configured." };
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon || !coupon.active) return { error: "Invalid or expired coupon." };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { error: "This coupon has expired." };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { error: "This coupon has already been used." };
  }
  if (coupon.customerId && coupon.customerId !== customerId) {
    return { error: "This coupon is not valid for your account." };
  }

  const discount =
    coupon.type === "percent"
      ? Math.min(subtotal, (subtotal * coupon.value) / 100)
      : Math.min(subtotal, coupon.value);

  if (discount <= 0) return { error: "Coupon does not apply to this order." };

  return { coupon, discount };
}

export async function redeemCoupon(couponId: string): Promise<void> {
  if (!prisma) return;
  await prisma.coupon.update({
    where: { id: couponId },
    data: { usedCount: { increment: 1 } },
  });
}
