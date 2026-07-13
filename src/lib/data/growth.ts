import "server-only";
import type { GrowthSource } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Growth tracking & molting.
 *
 * A specimen changes throughout its life but never changes identity:
 * - current size lives on Specimen (sizeCm + lastMeasuredAt)
 * - GrowthRecord is the append-only measurement history
 * - MoltEvent captures the biological event and feeds a new measurement
 */

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

export interface GrowthHistoryEntry {
  id: string;
  measuredAt: string;
  sizeCm: number;
  source: GrowthSource;
  notes: string;
}

export interface MoltHistoryEntry {
  id: string;
  moltedAt: string;
  previousSizeCm: number;
  newSizeEstimateCm: number;
  notes: string;
}

export async function getGrowthHistory(specimenId: string): Promise<GrowthHistoryEntry[]> {
  const db = requireDb();
  const rows = await db.growthRecord.findMany({
    where: { specimenId },
    orderBy: { measuredAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    measuredAt: r.measuredAt.toISOString().slice(0, 10),
    sizeCm: r.sizeCm,
    source: r.source,
    notes: r.notes,
  }));
}

export async function getMoltHistory(specimenId: string): Promise<MoltHistoryEntry[]> {
  const db = requireDb();
  const rows = await db.moltEvent.findMany({
    where: { specimenId },
    orderBy: { moltedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    moltedAt: r.moltedAt.toISOString().slice(0, 10),
    previousSizeCm: r.previousSizeCm,
    newSizeEstimateCm: r.newSizeEstimateCm,
    notes: r.notes,
  }));
}

/** Record a manual measurement: appends history and updates the specimen's current size. */
export async function recordMeasurement(input: {
  specimenId: string;
  sizeCm: number;
  measuredAt?: Date;
  source?: GrowthSource;
  notes?: string;
}): Promise<void> {
  const db = requireDb();
  if (!(input.sizeCm > 0)) throw new Error("Size (cm) must be greater than 0.");
  const measuredAt = input.measuredAt ?? new Date();

  await db.$transaction(async (tx) => {
    const s = await tx.specimen.findUnique({ where: { id: input.specimenId } });
    if (!s) throw new Error("Specimen not found.");

    await tx.growthRecord.create({
      data: {
        specimenId: input.specimenId,
        measuredAt,
        sizeCm: input.sizeCm,
        source: input.source ?? "manual",
        notes: input.notes ?? "",
      },
    });

    // Only move the "current size" forward in time.
    if (!s.lastMeasuredAt || measuredAt >= s.lastMeasuredAt) {
      await tx.specimen.update({
        where: { id: input.specimenId },
        data: { sizeCm: input.sizeCm, lastMeasuredAt: measuredAt },
      });
    }
  });
}

/**
 * Record a molt: creates the MoltEvent, appends a growth record, and updates
 * the specimen's current size. Identity and history remain untouched.
 */
export async function recordMolt(input: {
  specimenId: string;
  newSizeEstimateCm: number;
  moltedAt?: Date;
  notes?: string;
}): Promise<void> {
  const db = requireDb();
  if (!(input.newSizeEstimateCm > 0)) throw new Error("New size estimate must be greater than 0.");
  const moltedAt = input.moltedAt ?? new Date();

  await db.$transaction(async (tx) => {
    const s = await tx.specimen.findUnique({ where: { id: input.specimenId } });
    if (!s) throw new Error("Specimen not found.");

    await tx.moltEvent.create({
      data: {
        specimenId: input.specimenId,
        moltedAt,
        previousSizeCm: s.sizeCm,
        newSizeEstimateCm: input.newSizeEstimateCm,
        notes: input.notes ?? "",
      },
    });

    await tx.growthRecord.create({
      data: {
        specimenId: input.specimenId,
        measuredAt: moltedAt,
        sizeCm: input.newSizeEstimateCm,
        source: "molt",
        notes: input.notes ? `Molt — ${input.notes}` : "Molt",
      },
    });

    await tx.specimen.update({
      where: { id: input.specimenId },
      data: { sizeCm: input.newSizeEstimateCm, lastMeasuredAt: moltedAt },
    });
  });
}
