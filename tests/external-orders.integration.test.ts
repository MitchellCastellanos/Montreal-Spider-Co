import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Integration test against a REAL Postgres (schema pushed) with Stripe and email mocked.
// Run: DATABASE_URL=postgresql://…/msc_test DIRECT_URL=… npx vitest run tests/external-orders.integration.test.ts
const DB = process.env.DATABASE_URL ?? "";
const enabled = /msc_test/.test(DB);

const stripe = {
  checkout: { sessions: { create: vi.fn(async (p: unknown) => ({ id: "cs_x", url: "https://stripe.test/x", _p: p })) } },
  paymentIntents: {
    retrieve: vi.fn(),
    capture: vi.fn(),
    cancel: vi.fn(),
  },
};
const sent: { templateId: string; to?: string; data: Record<string, string> }[] = [];

vi.mock("@/lib/stripe", () => ({ getStripe: () => stripe, stripeConfigured: true }));
vi.mock("@/lib/notifications/service", () => ({
  sendNotification: vi.fn(async (i: { templateId: string; to: string; data: Record<string, string> }) => {
    sent.push({ templateId: i.templateId, to: i.to, data: i.data });
    return true;
  }),
  notifyStaff: vi.fn(async (i: { templateId: string; data: Record<string, string> }) => {
    sent.push({ templateId: i.templateId, to: "staff", data: i.data });
    return true;
  }),
  distributorBcc: () => undefined,
}));

describe.skipIf(!enabled)("made-to-order holds (real DB, mocked Stripe)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hold: any, fulfill: any, settingsMod: any, productsMod: any;
  let productId: string;
  let offerId: string;
  let n = 0;

  const makeSession = (over: { sessionId?: string; piId?: string } = {}) => {
    n++;
    const sessionId = over.sessionId ?? `cs_test_${n}_${Date.now()}`;
    const piId = over.piId ?? `pi_test_${n}_${Date.now()}`;
    return {
      session: {
        id: sessionId,
        payment_intent: piId,
        amount_total: 6900,
        customer_email: `buyer${n}@example.com`,
        customer_details: { email: `buyer${n}@example.com`, name: "Buyer" },
        metadata: {
          external: "1",
          locale: "en",
          method: "pickup",
          customerEmail: `buyer${n}@example.com`,
          customerName: "Buyer",
          customerPhone: "514-555-0100",
          subtotal: "60.00",
          discountAmount: "0.00",
          deliveryFee: "0.00",
          tax: "8.99",
          total: "68.99",
          pickupSubtype: "custom_meetup",
          customMeetupRequest: "Jean-Talon",
          orderItems: JSON.stringify([
            { offerId, productId, sizeCm: 5.08, sex: "female", nameEn: "Brachypelma hamorii", nameFr: "Brachypelma hamorii", sizeLabelEn: "2″", sizeLabelFr: "2″", qty: 1, price: 60 },
          ]),
        },
      },
      piId,
    };
  };

  const authorized = (piId: string) => stripe.paymentIntents.retrieve.mockResolvedValue({ id: piId, status: "requires_capture" });

  beforeAll(async () => {
    db = (await import("@/lib/db")).prisma;
    hold = await import("@/lib/external-orders/hold");
    fulfill = await import("@/lib/orders/fulfill-checkout");
    settingsMod = await import("@/lib/external-orders/settings");
    productsMod = await import("@/lib/data/products");
    await db.siteSetting.deleteMany({ where: { key: { startsWith: "external_" } } }); // every run starts with the defaults (switch OFF)
    await db.orderLineSpecimen.deleteMany();
    await db.inventoryMovement.deleteMany();
    await db.fulfillment.deleteMany();
    await db.specimen.deleteMany();
    await db.orderLine.deleteMany();
    await db.order.deleteMany();
    await db.supplierOffer.deleteMany();
    await db.coupon.deleteMany();
    await db.product.deleteMany();
    const p = await db.product.create({
      data: { slug: "b-hamorii-test", scientific: "Brachypelma hamorii", commonEn: "Mexican Redknee", commonFr: "Genou rouge", genus: "Brachypelma", experience: "beginner", type: "terrestrial", temperament: "docile" },
    });
    productId = p.id;
    const o = await db.supplierOffer.create({
      data: { productId, sizeCm: 5.08, sex: "female", price: 60, unitCost: 40, leadDaysMin: 1, leadDaysMax: 3, maxPerOrder: 1, published: true },
    });
    offerId = o.id;
  });

  beforeEach(() => {
    sent.length = 0;
    vi.clearAllMocks();
  });

  it("creates a HELD order: authorized, no specimen, no fulfillment, deadline set, emails sent, idempotent", async () => {
    const { session, piId } = makeSession();
    authorized(piId);
    const order = await fulfill.fulfillCheckoutSession(session);
    const row = await db.order.findUnique({ where: { id: order.id }, include: { lines: true } });
    expect(row.holdStatus).toBe("authorized");
    expect(row.status).toBe("processing");
    expect(row.holdDeadline.getTime()).toBeGreaterThan(Date.now());
    expect(row.holdAuthExpiresAt.getTime()).toBeGreaterThanOrEqual(row.holdDeadline.getTime());
    expect(row.lines[0].supplierOfferId).toBe(offerId);
    expect(await db.specimen.count()).toBe(0); // never a fake specimen
    expect(await db.fulfillment.count({ where: { orderId: order.id } })).toBe(0);
    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled(); // not charged
    expect(sent.map((s) => s.templateId).sort()).toEqual(["external-order-received", "internal-external-order"]);

    const again = await fulfill.fulfillCheckoutSession(session); // webhook retry
    expect(again.id).toBe(order.id);
    expect(await db.order.count({ where: { stripeSessionId: session.id } })).toBe(1);
  });

  it("confirm: captures once, creates an allocated specimen with real cost, links it, opens fulfillment", async () => {
    const { session, piId } = makeSession();
    authorized(piId);
    const order = await fulfill.fulfillCheckoutSession(session);
    sent.length = 0;
    stripe.paymentIntents.capture.mockResolvedValue({ id: piId, status: "succeeded" });

    await hold.confirmExternalOrder(order.id, { unitCost: 42.5 });

    expect(stripe.paymentIntents.capture).toHaveBeenCalledTimes(1);
    const row = await db.order.findUnique({ where: { id: order.id } });
    expect(row.holdStatus).toBe("captured");
    expect(row.status).toBe("paid");
    const links = await db.orderLineSpecimen.findMany({ where: { orderLine: { orderId: order.id } }, include: { specimen: true } });
    expect(links).toHaveLength(1);
    const sp = links[0].specimen;
    expect(sp).toMatchObject({ status: "allocated", unitCost: 42.5, salePrice: 60, sex: "female", supplier: "Tarantula Canada", locationType: "warehouse" });
    expect(sp.qrToken).toBeTruthy();
    expect((await db.inventoryMovement.findMany({ where: { specimenId: sp.id } })).map((m: { type: string }) => m.type).sort()).toEqual(["allocation", "purchase"]);
    expect(await db.fulfillment.count({ where: { orderId: order.id } })).toBe(1);
    expect(sent.map((s) => s.templateId)).toEqual(["external-order-confirmed"]);

    await expect(hold.confirmExternalOrder(order.id)).rejects.toThrow(/already confirmed/);
    expect(stripe.paymentIntents.capture).toHaveBeenCalledTimes(1);
  });

  it("confirm after the authorization lapsed: nobody is charged, order is released", async () => {
    const { session, piId } = makeSession();
    authorized(piId);
    const order = await fulfill.fulfillCheckoutSession(session);
    stripe.paymentIntents.retrieve.mockResolvedValue({ id: piId, status: "canceled" });
    await expect(hold.confirmExternalOrder(order.id)).rejects.toThrow(/expired/);
    const row = await db.order.findUnique({ where: { id: order.id } });
    expect(row.holdStatus).toBe("released");
    expect(await db.specimen.count({ where: { orderId: order.id } })).toBe(0);
  });

  it("decline: cancels the hold (never captures), issues a single-use credit, emails the apology", async () => {
    const { session, piId } = makeSession();
    authorized(piId);
    const order = await fulfill.fulfillCheckoutSession(session);
    sent.length = 0;
    stripe.paymentIntents.cancel.mockResolvedValue({ id: piId, status: "canceled" });

    const { couponCode } = await hold.declineExternalOrder(order.id, { credit: 10 });

    expect(stripe.paymentIntents.cancel).toHaveBeenCalledTimes(1);
    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled();
    const row = await db.order.findUnique({ where: { id: order.id } });
    expect(row).toMatchObject({ holdStatus: "released", status: "cancelled" });
    const coupon = await db.coupon.findUnique({ where: { code: couponCode } });
    expect(coupon).toMatchObject({ type: "fixed", value: 10, maxUses: 1, active: true });
    const mail = sent.find((s) => s.templateId === "external-order-unavailable")!;
    expect(mail.data.creditLine).toContain(couponCode);
    expect(await db.specimen.count({ where: { orderId: order.id } })).toBe(0);
    await expect(hold.declineExternalOrder(order.id)).rejects.toThrow(/Already released/);
  });

  it("decline without credit sends no coupon; refuses if the payment was already captured", async () => {
    const a = makeSession();
    authorized(a.piId);
    const o1 = await fulfill.fulfillCheckoutSession(a.session);
    stripe.paymentIntents.cancel.mockResolvedValue({});
    const r = await hold.declineExternalOrder(o1.id, { credit: 0 });
    expect(r.couponCode).toBeNull();
    expect(sent.find((s) => s.templateId === "external-order-unavailable")!.data.creditLine).toBe("");

    const b = makeSession();
    authorized(b.piId);
    const o2 = await fulfill.fulfillCheckoutSession(b.session);
    stripe.paymentIntents.retrieve.mockResolvedValue({ id: b.piId, status: "succeeded" });
    await expect(hold.declineExternalOrder(o2.id)).rejects.toThrow(/already captured/);
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledTimes(1); // only the first
  });

  it("extend: pushes the deadline out, counts the extension, emails the customer, respects the safe limit", async () => {
    const { session, piId } = makeSession();
    authorized(piId);
    const order = await fulfill.fulfillCheckoutSession(session);
    const before = await db.order.findUnique({ where: { id: order.id } });
    sent.length = 0;

    const r1 = await hold.extendExternalHold(order.id, 1);
    const after = await db.order.findUnique({ where: { id: order.id } });
    expect(after.holdDeadline.getTime()).toBeGreaterThan(before.holdDeadline.getTime());
    expect(after.holdDeadline.getTime()).toBeLessThanOrEqual(after.holdAuthExpiresAt.getTime());
    expect(after.holdExtensions).toBe(1);
    expect(r1.deadline.getTime()).toBe(after.holdDeadline.getTime());
    expect(sent.map((s) => s.templateId)).toEqual(["external-order-delayed"]);

    // Keep extending: it must cap at the authorization limit, then refuse.
    let last = after.holdDeadline.getTime();
    let refused = false;
    for (let i = 0; i < 6 && !refused; i++) {
      try {
        const r = await hold.extendExternalHold(order.id, 5);
        expect(r.deadline.getTime()).toBeLessThanOrEqual(after.holdAuthExpiresAt.getTime());
        last = r.deadline.getTime();
      } catch (e) {
        refused = /safe limit/.test((e as Error).message);
        expect(refused).toBe(true);
      }
    }
    expect(refused).toBe(true);
    expect(last).toBe(after.holdAuthExpiresAt.getTime());
  });

  it("sweep: releases overdue holds (with default credit), reminds about due-soon ones, leaves the rest", async () => {
    const mk = async (deadline: Date) => {
      const { session, piId } = makeSession();
      authorized(piId);
      const o = await fulfill.fulfillCheckoutSession(session);
      await db.order.update({ where: { id: o.id }, data: { holdDeadline: deadline, holdAuthExpiresAt: new Date(Date.now() + 3 * 86400000) } });
      return o.id as string;
    };
    // Close out earlier held orders from other tests so the sweep only sees these three.
    await db.order.updateMany({ where: { holdStatus: "authorized" }, data: { holdStatus: "released" } });
    const overdue = await mk(new Date(Date.now() - 3600_000));
    const soon = await mk(new Date(Date.now() + 5 * 3600_000));
    const later = await mk(new Date(Date.now() + 3 * 86400000));
    stripe.paymentIntents.retrieve.mockImplementation(async () => ({ id: "x", status: "requires_capture" }));
    stripe.paymentIntents.cancel.mockResolvedValue({});
    sent.length = 0;

    const r = await hold.processExternalHolds();

    expect(r).toEqual({ released: 1, reminded: 1, errors: 0 });
    expect((await db.order.findUnique({ where: { id: overdue } })).holdStatus).toBe("released");
    expect((await db.order.findUnique({ where: { id: soon } })).holdStatus).toBe("authorized");
    expect((await db.order.findUnique({ where: { id: later } })).holdStatus).toBe("authorized");
    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled();
  });

  it("storefront: offers appear only when enabled, never when an equivalent own specimen exists; own inventory unaffected", async () => {
    const find = async () => (await productsMod.getProductBySlug("b-hamorii-test"))?.availability ?? [];
    // switch off (default) → hidden
    expect((await find()).filter((u: { source?: string }) => u.source === "external")).toHaveLength(0);

    const s = await settingsMod.getExternalSettings();
    await settingsMod.saveExternalSettings({ ...s, enabled: true });
    // `getExternalSettings` is request-cached by React; tolerate that in tests by re-importing fresh module state
    vi.resetModules();
    const fresh = await import("@/lib/data/products");
    const units = (await fresh.getProductBySlug("b-hamorii-test"))?.availability ?? [];
    const ext = units.filter((u: { source?: string }) => u.source === "external");
    expect(ext).toHaveLength(1);
    expect(ext[0]).toMatchObject({ sex: "female", price: 60, stock: 1, leadDays: { min: 1, max: 3 } });
    expect(ext[0].key).toBe(`ext:${offerId}`);
    expect(JSON.stringify(units)).not.toContain("unitCost"); // supplier cost never reaches the storefront

    // An equivalent own specimen (same sex, within 0.5 cm) hides the external offer.
    await db.specimen.create({ data: { productId, sizeCm: 5.2, sex: "female", price: 80, status: "available", locationType: "warehouse", unitCost: 30 } });
    vi.resetModules();
    const fresh2 = await import("@/lib/data/products");
    const units2 = (await fresh2.getProductBySlug("b-hamorii-test"))?.availability ?? [];
    expect(units2.filter((u: { source?: string }) => u.source === "external")).toHaveLength(0);
    expect(units2.filter((u: { source?: string }) => u.source !== "external")).toHaveLength(1);
  });

  it("checkout: external line uses the SERVER price, authorizes only (manual capture), and can't be mixed", async () => {
    const co = await import("@/lib/checkout-stripe");
    const base = {
      locale: "en" as const,
      pickupSubtype: "custom_meetup" as const,
      customMeetupRequest: "Jean-Talon",
      customer: { name: "A", email: "a@example.com", phone: "514" },
    };
    // client lies about nothing: price isn't even sent; qty over the limit is rejected
    await expect(co.validateAndBuildCheckout({ ...base, items: [{ productId, unitKey: `ext:${offerId}`, qty: 2 }] })).rejects.toThrow(/at most 1/);
    // unknown / hidden offer
    await expect(co.validateAndBuildCheckout({ ...base, items: [{ productId, unitKey: "ext:nope", qty: 1 }] })).rejects.toThrow(/no longer available/);
    // mixing with another item is refused
    await expect(
      co.validateAndBuildCheckout({ ...base, items: [{ productId, unitKey: `ext:${offerId}`, qty: 1 }, { productId, unitKey: "5.2:female:80", qty: 1 }] }),
    ).rejects.toThrow(/on their own/);

    const ok = await co.validateAndBuildCheckout({ ...base, items: [{ productId, unitKey: `ext:${offerId}`, qty: 1 }] });
    expect(ok.external).toBe(true);
    expect(ok.metadata.external).toBe("1");
    expect(ok.lineItems[0].price_data?.unit_amount).toBe(6000);
    expect(JSON.parse(ok.metadata.orderItems)[0]).toMatchObject({ offerId, price: 60 });

    // the Stripe session only AUTHORIZES the card; a regular item is captured immediately
    const session = await co.createCheckoutSession({ ...base, items: [{ productId, unitKey: `ext:${offerId}`, qty: 1 }] }, "https://x/ok", "https://x/cancel");
    expect(session).toBeTruthy();
    const params = stripe.checkout.sessions.create.mock.calls[0][0] as { payment_intent_data: { capture_method?: string } };
    expect(params.payment_intent_data.capture_method).toBe("manual");

    // switch off → refused
    const s = await settingsMod.getExternalSettings();
    await settingsMod.saveExternalSettings({ ...s, enabled: false });
    vi.resetModules();
    const co2 = await import("@/lib/checkout-stripe");
    await expect(co2.validateAndBuildCheckout({ ...base, items: [{ productId, unitKey: `ext:${offerId}`, qty: 1 }] })).rejects.toThrow(/not available right now/);
  });
});

describe.skipIf(!enabled)("rotation by visits + profit pricing (real DB)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any, svc: any, settingsMod: any, offers: any;
  const ids: Record<string, string> = {};

  const settle = async (over: Record<string, unknown>) => {
    const s = await settingsMod.getExternalSettings();
    await settingsMod.saveExternalSettings({ ...s, enabled: true, ...over });
    vi.resetModules();
    svc = await import("@/lib/external-orders/rotation-service");
  };
  const published = async () =>
    (await db.supplierOffer.findMany({ where: { published: true }, select: { id: true } })).map((o: { id: string }) => o.id).sort();

  beforeAll(async () => {
    db = (await import("@/lib/db")).prisma;
    settingsMod = await import("@/lib/external-orders/settings");
    offers = await import("@/lib/external-orders/offers");
    await db.siteSetting.deleteMany({ where: { key: { startsWith: "external_" } } });
    await db.orderLineSpecimen.deleteMany();
    await db.inventoryMovement.deleteMany();
    await db.fulfillment.deleteMany();
    await db.specimen.deleteMany();
    await db.orderLine.deleteMany();
    await db.order.deleteMany();
    await db.pageView.deleteMany();
    await db.supplierOffer.deleteMany();
    await db.product.deleteMany();
    // Four species listings with different traffic: 40, 5, 0 and 12 views in the window.
    const views: Record<string, number> = { hamorii: 40, boehmei: 5, emilia: 0, vagans: 12 };
    for (const [slug, n] of Object.entries(views)) {
      const p = await db.product.create({
        data: { slug, scientific: `Test ${slug}`, commonEn: slug, commonFr: slug, genus: "Test", experience: "beginner", type: "terrestrial", temperament: "docile" },
      });
      for (let i = 0; i < n; i++) await db.pageView.create({ data: { path: `/product/${slug}`, visitorHash: `v${slug}${i}` } });
      // an OLD view outside the 14-day window must not count
      await db.pageView.create({ data: { path: `/product/${slug}`, visitorHash: `old${slug}`, createdAt: new Date(Date.now() - 40 * 86400000) } });
      const o = await db.supplierOffer.create({ data: { productId: p.id, sizeCm: 5, sex: "unsexed", price: 0, unitCost: 35, priceMode: "margin", published: false } });
      ids[slug] = o.id;
    }
  });

  it("shows the LEAST visited offers (outside-window views ignored) and prices them by profit margin", async () => {
    await settle({ rotationMode: "suggest", rotationSlots: 2, rotationMinDays: 7, rotationWindowDays: 14, marginPct: 30, minProfit: 12, handlingCost: 4, lossReservePct: 4 });
    const { plan, rows } = await svc.buildRotation();
    expect(rows[ids.emilia].visits).toBe(0);
    expect(rows[ids.hamorii].visits).toBe(40);
    expect(plan.publish.sort()).toEqual([ids.emilia, ids.boehmei].sort());

    expect(await published()).toEqual([]); // suggest mode: building a plan changes nothing
    await svc.applyRotationNow();
    expect(await published()).toEqual([ids.emilia, ids.boehmei].sort());
    const live = await db.supplierOffer.findUnique({ where: { id: ids.emilia } });
    expect(live.publishedAt).toBeTruthy();
    // cost 35 @ 30% target: price meets BOTH the margin and the $12 minimum
    const { breakdownAt, DEFAULT_PRICING } = await import("@/lib/external-orders/pricing");
    const b = breakdownAt(live.price, 35, { ...DEFAULT_PRICING, marginPct: 30, minProfit: 12, handlingCost: 4, lossReservePct: 4 });
    expect(live.price).toBeGreaterThan(35);
    expect(live.price % 5).toBe(0);
    expect(b.operatingMarginPct).toBeGreaterThanOrEqual(30);
    expect(b.operatingProfit).toBeGreaterThanOrEqual(12);
  });

  it("does not rotate again inside the minimum display time, even when traffic changes", async () => {
    for (let i = 0; i < 100; i++) await db.pageView.create({ data: { path: "/product/emilia", visitorHash: `burst${i}` } });
    const { plan } = await svc.buildRotation();
    expect(plan.unpublish).toEqual([]);
    expect(plan.publish).toEqual([]);
  });

  it("after the minimum time, rotates the now-busy offer out for a quieter one", async () => {
    await db.supplierOffer.update({ where: { id: ids.emilia }, data: { publishedAt: new Date(Date.now() - 10 * 86400000) } });
    const { plan } = await svc.buildRotation();
    expect(plan.unpublish).toEqual([ids.emilia]);
    expect(plan.publish).toEqual([ids.vagans]); // next-least visited (12) beats hamorii (40)
  });

  it("auto mode applies it from the cron; suggest/off do not", async () => {
    await settle({ rotationMode: "suggest" });
    expect(await svc.runRotation()).toMatchObject({ mode: "suggest", published: 0, hidden: 0 });
    await settle({ rotationMode: "off" });
    expect(await svc.runRotation()).toMatchObject({ mode: "off", published: 0 });
    await settle({ rotationMode: "auto" });
    const r = await svc.runRotation();
    expect(r).toMatchObject({ mode: "auto", published: 1, hidden: 1 });
    expect(await published()).toEqual([ids.boehmei, ids.vagans].sort());
    expect((await svc.getLastRotation())?.mode).toBe("auto");
  });

  it("pinned stays; an offer below the profit target is hidden and never shown; no cost = ineligible", async () => {
    await settle({ rotationMode: "auto", rotationSlots: 3 });
    await db.supplierOffer.update({ where: { id: ids.hamorii }, data: { pinned: true } });
    // manual price too low for the target on a published offer → must be hidden
    await db.supplierOffer.update({ where: { id: ids.vagans }, data: { priceMode: "manual", price: 40 } });
    await db.supplierOffer.update({ where: { id: ids.boehmei }, data: { unitCost: 0 } });
    await svc.runRotation();
    const vis = await published();
    expect(vis).toContain(ids.hamorii);
    expect(vis).not.toContain(ids.vagans);
    expect(vis).not.toContain(ids.boehmei);
  });

  it("reprice follows today's cost and margin rules; refuses without a cost", async () => {
    await settle({ rotationMode: "suggest", marginPct: 40 });
    const before = (await db.supplierOffer.findUnique({ where: { id: ids.emilia } })).price;
    const after = await svc.repriceOffer(ids.emilia);
    expect(after).toBeGreaterThanOrEqual(before);
    await expect(svc.repriceOffer(ids.boehmei)).rejects.toThrow(/supplier cost/);
  });

  it("kill switch hides everything (own inventory is a separate table)", async () => {
    expect(await offers.unpublishAllOffers()).toBeGreaterThan(0);
    expect(await published()).toEqual([]);
  });
});
