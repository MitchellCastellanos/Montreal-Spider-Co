import "server-only";
import type { SettlementPaymentStatus, StatementStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatCmAsInches } from "@/lib/size-inches";
import { sendNotification } from "@/lib/notifications/service";

/**
 * Settlement ledger — partner financial tracking.
 *
 * Every partner sale creates a ledger entry; monthly statements are generated
 * FROM the ledger. Balances always come from these financial records, never
 * from inventory counts.
 */

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

export interface SettlementEntryView {
  id: string;
  locationId: string;
  locationName: string;
  specimenId: string;
  scientific: string;
  sizeLabel: string;
  soldAt: string;
  salePrice: number;
  settlementPrice: number;
  partnerMargin: number;
  paymentStatus: SettlementPaymentStatus;
  statementId: string | null;
  notes: string;
}

export interface StatementView {
  id: string;
  locationId: string;
  locationName: string;
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  totalOwed: number;
  totalMargin: number;
  entryCount: number;
  status: StatementStatus;
  sentAt: string | null;
  paidAt: string | null;
}

const entryInclude = {
  location: { select: { name: true } },
  specimen: { include: { product: { select: { scientific: true } } } },
} as const;

export async function listSettlementEntries(filters: {
  locationId?: string;
  paymentStatus?: SettlementPaymentStatus;
} = {}): Promise<SettlementEntryView[]> {
  const db = requireDb();
  const rows = await db.settlementEntry.findMany({
    where: {
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
    },
    include: entryInclude,
    orderBy: { soldAt: "desc" },
    take: 300,
  });
  return rows.map((e) => ({
    id: e.id,
    locationId: e.locationId,
    locationName: e.location.name,
    specimenId: e.specimenId,
    scientific: e.specimen.product.scientific,
    sizeLabel: formatCmAsInches(e.specimen.sizeCm),
    soldAt: e.soldAt.toISOString().slice(0, 10),
    salePrice: e.salePrice,
    settlementPrice: e.settlementPrice,
    partnerMargin: e.partnerMargin,
    paymentStatus: e.paymentStatus,
    statementId: e.statementId,
    notes: e.notes,
  }));
}

export async function listStatements(): Promise<StatementView[]> {
  const db = requireDb();
  const rows = await db.settlementStatement.findMany({
    include: { location: { select: { name: true } }, entries: { select: { id: true } } },
    orderBy: { periodStart: "desc" },
    take: 100,
  });
  return rows.map((s) => ({
    id: s.id,
    locationId: s.locationId,
    locationName: s.location.name,
    periodStart: s.periodStart.toISOString().slice(0, 10),
    periodEnd: s.periodEnd.toISOString().slice(0, 10),
    totalSales: s.totalSales,
    totalOwed: s.totalOwed,
    totalMargin: s.totalMargin,
    entryCount: s.entries.length,
    status: s.status,
    sentAt: s.sentAt?.toISOString().slice(0, 10) ?? null,
    paidAt: s.paidAt?.toISOString().slice(0, 10) ?? null,
  }));
}

/**
 * Generate (or regenerate totals for) the monthly statement for a partner from
 * un-invoiced ledger entries in the period. Month is 1-12.
 */
export async function generateMonthlyStatement(locationId: string, year: number, month: number): Promise<string> {
  const db = requireDb();
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));

  return db.$transaction(async (tx) => {
    const entries = await tx.settlementEntry.findMany({
      where: {
        locationId,
        paymentStatus: "pending",
        statementId: null,
        soldAt: { gte: periodStart, lt: periodEnd },
      },
    });
    if (!entries.length) throw new Error("No un-invoiced ledger entries in that period.");

    const totalSales = entries.reduce((sum, e) => sum + e.salePrice, 0);
    const totalOwed = entries.reduce((sum, e) => sum + e.settlementPrice, 0);
    const totalMargin = entries.reduce((sum, e) => sum + e.partnerMargin, 0);

    const statement = await tx.settlementStatement.upsert({
      where: { locationId_periodStart_periodEnd: { locationId, periodStart, periodEnd } },
      create: { locationId, periodStart, periodEnd, totalSales, totalOwed, totalMargin },
      update: {
        totalSales: { increment: totalSales },
        totalOwed: { increment: totalOwed },
        totalMargin: { increment: totalMargin },
      },
    });

    await tx.settlementEntry.updateMany({
      where: { id: { in: entries.map((e) => e.id) } },
      data: { statementId: statement.id, paymentStatus: "invoiced" },
    });

    return statement.id;
  });
}

/** Email the statement summary to the partner (draft → sent). */
export async function sendStatement(statementId: string): Promise<void> {
  const db = requireDb();
  const s = await db.settlementStatement.findUnique({
    where: { id: statementId },
    include: { location: true, entries: true },
  });
  if (!s) throw new Error("Statement not found.");
  if (!s.location.email) throw new Error("Partner has no email on file.");

  const period = s.periodStart.toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" });

  await sendNotification({
    templateId: "partner-monthly-statement",
    event: "settlement.statement_sent",
    to: s.location.email,
    data: {
      partnerName: s.location.contactName || s.location.name,
      period,
      salesCount: String(s.entries.length),
      totalSales: `$${s.totalSales.toFixed(2)} CAD`,
      totalOwed: `$${s.totalOwed.toFixed(2)} CAD`,
      totalMargin: `$${s.totalMargin.toFixed(2)} CAD`,
    },
    context: { statementId, locationId: s.locationId },
  });

  await db.settlementStatement.update({
    where: { id: statementId },
    data: { status: "sent", sentAt: new Date() },
  });
}

/** Record partner payment (sent → paid); all entries become paid. */
export async function markStatementPaid(statementId: string): Promise<void> {
  const db = requireDb();
  const s = await db.settlementStatement.findUnique({
    where: { id: statementId },
    include: { location: true },
  });
  if (!s) throw new Error("Statement not found.");

  await db.$transaction([
    db.settlementStatement.update({
      where: { id: statementId },
      data: { status: "paid", paidAt: new Date() },
    }),
    db.settlementEntry.updateMany({
      where: { statementId },
      data: { paymentStatus: "paid" },
    }),
  ]);

  if (s.location.email) {
    const period = s.periodStart.toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" });
    await sendNotification({
      templateId: "partner-payment-received",
      event: "settlement.paid",
      to: s.location.email,
      data: {
        partnerName: s.location.contactName || s.location.name,
        period,
        amount: `$${s.totalOwed.toFixed(2)} CAD`,
      },
      context: { statementId, locationId: s.locationId },
    });
  }
}

/**
 * Settle a partner's entire outstanding balance in one step: invoices any
 * un-invoiced ledger entries (grouped by month, same as generateMonthlyStatement)
 * and marks every draft/sent statement for the location as paid. This is the
 * shortcut behind the "Mark paid" button on the partner's balance card — it
 * skips the manual generate → send → mark-paid statement workflow.
 */
export async function settleOutstandingBalance(locationId: string): Promise<{ amount: number; statementCount: number }> {
  const db = requireDb();

  const paidStatementIds = await db.$transaction(async (tx) => {
    const pending = await tx.settlementEntry.findMany({
      where: { locationId, paymentStatus: "pending", statementId: null },
    });

    const byMonth = new Map<string, typeof pending>();
    for (const e of pending) {
      const key = `${e.soldAt.getUTCFullYear()}-${e.soldAt.getUTCMonth()}`;
      const group = byMonth.get(key) ?? [];
      group.push(e);
      byMonth.set(key, group);
    }

    for (const group of byMonth.values()) {
      const sample = group[0].soldAt;
      const periodStart = new Date(Date.UTC(sample.getUTCFullYear(), sample.getUTCMonth(), 1));
      const periodEnd = new Date(Date.UTC(sample.getUTCFullYear(), sample.getUTCMonth() + 1, 1));
      const totalSales = group.reduce((sum, e) => sum + e.salePrice, 0);
      const totalOwed = group.reduce((sum, e) => sum + e.settlementPrice, 0);
      const totalMargin = group.reduce((sum, e) => sum + e.partnerMargin, 0);

      const statement = await tx.settlementStatement.upsert({
        where: { locationId_periodStart_periodEnd: { locationId, periodStart, periodEnd } },
        create: { locationId, periodStart, periodEnd, totalSales, totalOwed, totalMargin },
        update: {
          totalSales: { increment: totalSales },
          totalOwed: { increment: totalOwed },
          totalMargin: { increment: totalMargin },
        },
      });

      await tx.settlementEntry.updateMany({
        where: { id: { in: group.map((e) => e.id) } },
        data: { statementId: statement.id, paymentStatus: "invoiced" },
      });
    }

    const unpaid = await tx.settlementStatement.findMany({
      where: { locationId, status: { in: ["draft", "sent"] } },
      select: { id: true },
    });
    const ids = unpaid.map((s) => s.id);
    if (!ids.length) return ids;

    await tx.settlementStatement.updateMany({
      where: { id: { in: ids } },
      data: { status: "paid", paidAt: new Date() },
    });
    await tx.settlementEntry.updateMany({
      where: { statementId: { in: ids } },
      data: { paymentStatus: "paid" },
    });

    return ids;
  });

  if (!paidStatementIds.length) throw new Error("No outstanding balance to settle.");

  const statements = await db.settlementStatement.findMany({
    where: { id: { in: paidStatementIds } },
    include: { location: true },
    orderBy: { periodStart: "asc" },
  });

  const amount = statements.reduce((sum, s) => sum + s.totalOwed, 0);
  const location = statements[0].location;

  if (location.email) {
    const fmt = (d: Date) => d.toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" });
    const first = fmt(statements[0].periodStart);
    const last = fmt(statements[statements.length - 1].periodStart);
    const period = first === last ? first : `${first} – ${last}`;

    await sendNotification({
      templateId: "partner-payment-received",
      event: "settlement.paid",
      to: location.email,
      data: {
        partnerName: location.contactName || location.name,
        period,
        amount: `$${amount.toFixed(2)} CAD`,
      },
      context: { locationId, statementIds: paidStatementIds.join(",") },
    });
  }

  return { amount, statementCount: statements.length };
}

/** Outstanding balance per partner — always from the ledger, never from inventory. */
export async function getPartnerBalances(): Promise<
  { locationId: string; locationName: string; pendingOwed: number; invoicedOwed: number; entryCount: number }[]
> {
  const db = requireDb();
  const rows = await db.settlementEntry.findMany({
    where: { paymentStatus: { in: ["pending", "invoiced"] } },
    include: { location: { select: { name: true } } },
  });
  const byLocation = new Map<string, { locationId: string; locationName: string; pendingOwed: number; invoicedOwed: number; entryCount: number }>();
  for (const e of rows) {
    const entry = byLocation.get(e.locationId) ?? {
      locationId: e.locationId,
      locationName: e.location.name,
      pendingOwed: 0,
      invoicedOwed: 0,
      entryCount: 0,
    };
    if (e.paymentStatus === "pending") entry.pendingOwed += e.settlementPrice;
    else entry.invoicedOwed += e.settlementPrice;
    entry.entryCount++;
    byLocation.set(e.locationId, entry);
  }
  return [...byLocation.values()].sort((a, b) => b.pendingOwed - a.pendingOwed);
}
