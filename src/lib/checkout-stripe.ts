import "server-only";
import type Stripe from "stripe";
import { getProductById } from "@/lib/data/products";
import { DELIVERY_ZONES, FREE_DELIVERY_THRESHOLD } from "@/lib/locations";
import { SITE } from "@/lib/site";
import { getStripe } from "@/lib/stripe";
import type { Locale } from "@/i18n/config";

export interface CheckoutLineInput {
  productId: string;
  sizeId: string;
  qty: number;
}

export interface CheckoutCustomerInput {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  postal?: string;
  notes?: string;
}

export interface CheckoutPayload {
  locale: Locale;
  method: "delivery" | "pickup";
  zoneId?: string;
  pickupId?: string;
  customerId?: string;
  items: CheckoutLineInput[];
  customer: CheckoutCustomerInput;
}

export interface ValidatedCheckout {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  metadata: Record<string, string>;
}

function cadCents(amount: number): number {
  return Math.round(amount * 100);
}

export async function validateAndBuildCheckout(payload: CheckoutPayload): Promise<ValidatedCheckout> {
  const { locale, method, zoneId, pickupId, items, customer, customerId } = payload;

  if (!items.length) throw new CheckoutError("Cart is empty.", 400);
  if (!customer.name?.trim() || !customer.email?.trim() || !customer.phone?.trim()) {
    throw new CheckoutError("Missing contact details.", 400);
  }

  if (method === "delivery") {
    if (!customer.address?.trim() || !customer.city?.trim() || !customer.postal?.trim()) {
      throw new CheckoutError("Missing delivery address.", 400);
    }
    if (!zoneId || !DELIVERY_ZONES.some((z) => z.id === zoneId)) {
      throw new CheckoutError("Invalid delivery zone.", 400);
    }
  } else if (!pickupId) {
    throw new CheckoutError("Pickup point is required.", 400);
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let subtotal = 0;
  const orderItems: {
    productId: string;
    sizeKey: string;
    nameEn: string;
    nameFr: string;
    sizeLabelEn: string;
    sizeLabelFr: string;
    qty: number;
    price: number;
  }[] = [];

  for (const item of items) {
    if (item.qty < 1 || item.qty > 20) throw new CheckoutError("Invalid quantity.", 400);

    const product = await getProductById(item.productId);
    if (!product) throw new CheckoutError("Product not found.", 400);

    const size = product.sizes.find((s) => s.id === item.sizeId);
    if (!size) throw new CheckoutError("Size not found.", 400);
    if (size.stock < item.qty) throw new CheckoutError(`${product.common[locale]} is out of stock.`, 400);

    const name = `${product.common[locale]} — ${size.label[locale]}`;
    subtotal += size.price * item.qty;
    orderItems.push({
      productId: product.id,
      sizeKey: size.id,
      nameEn: product.common.en,
      nameFr: product.common.fr,
      sizeLabelEn: size.label.en,
      sizeLabelFr: size.label.fr,
      qty: item.qty,
      price: size.price,
    });

    lineItems.push({
      quantity: item.qty,
      price_data: {
        currency: "cad",
        unit_amount: cadCents(size.price),
        product_data: {
          name,
          ...(product.image ? { images: [product.image] } : {}),
          metadata: {
            productId: product.id,
            sizeId: size.id,
            slug: product.slug,
          },
        },
      },
    });
  }

  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId);
  const deliveryFee =
    method === "pickup" ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (zone?.fee ?? 0);

  if (deliveryFee > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "cad",
        unit_amount: cadCents(deliveryFee),
        product_data: {
          name: locale === "fr" ? "Frais de livraison" : "Delivery fee",
        },
      },
    });
  }

  const tax = (subtotal + deliveryFee) * SITE.taxRate;
  if (tax > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "cad",
        unit_amount: cadCents(tax),
        product_data: {
          name: locale === "fr" ? "TPS + TVQ" : "GST + QST",
        },
      },
    });
  }

  const total = subtotal + deliveryFee + tax;

  const metadata: Record<string, string> = {
    locale,
    method,
    customerEmail: customer.email.trim().toLowerCase(),
    customerName: customer.name.trim(),
    customerPhone: customer.phone.trim(),
    customerNotes: customer.notes?.trim() ?? "",
    cartItems: items.map((i) => `${i.productId}:${i.sizeId}:${i.qty}`).join("|"),
    orderItems: JSON.stringify(orderItems),
    subtotal: subtotal.toFixed(2),
    deliveryFee: deliveryFee.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
  };

  if (method === "delivery") {
    metadata.zoneId = zoneId!;
    metadata.address = customer.address!.trim();
    metadata.city = customer.city!.trim();
    metadata.postal = customer.postal!.trim();
  } else {
    metadata.pickupId = pickupId!;
  }

  if (customerId) {
    metadata.customerId = customerId;
  }

  return { subtotal, deliveryFee, tax, total, lineItems, metadata };
}

export async function createCheckoutSession(
  payload: CheckoutPayload,
  successUrl: string,
  cancelUrl: string,
): Promise<Stripe.Checkout.Session> {
  const { lineItems, metadata } = await validateAndBuildCheckout(payload);
  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: payload.customer.email.trim(),
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale: payload.locale === "fr" ? "fr" : "en",
    metadata,
    payment_intent_data: {
      metadata,
    },
  });
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}
