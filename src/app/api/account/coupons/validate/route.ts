import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/account/coupons";
import { getCustomerIdFromSession } from "@/lib/customer-auth";

export async function POST(req: Request) {
  const customerId = await getCustomerIdFromSession();

  let body: { code?: string; subtotal?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const subtotal = Number(body.subtotal ?? 0);
  if (!body.code || subtotal <= 0) {
    return NextResponse.json({ error: "Invalid coupon request." }, { status: 400 });
  }

  const result = await validateCoupon(body.code, customerId, subtotal);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    code: result.coupon.code,
    type: result.coupon.type,
    value: result.coupon.value,
    discount: result.discount,
    couponId: result.coupon.id,
  });
}
