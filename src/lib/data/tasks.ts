import "server-only";
import type { TaskStatus, TaskType } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Internal operations tasks — manual decisions surfaced to the MSC team. */

function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

export interface TaskView {
  id: string;
  type: TaskType;
  status: TaskStatus;
  title: string;
  details: string;
  specimenId: string | null;
  locationName: string | null;
  orderNumber: string | null;
  dueAt: string | null;
  resolution: string;
  createdAt: string;
}

export async function listTasks(statuses: TaskStatus[] = ["open", "in_progress"]): Promise<TaskView[]> {
  const db = requireDb();
  const rows = await db.operationsTask.findMany({
    where: { status: { in: statuses } },
    include: {
      location: { select: { name: true } },
      order: { select: { orderNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((t) => ({
    id: t.id,
    type: t.type,
    status: t.status,
    title: t.title,
    details: t.details,
    specimenId: t.specimenId,
    locationName: t.location?.name ?? null,
    orderNumber: t.order?.orderNumber ?? null,
    dueAt: t.dueAt?.toISOString().slice(0, 10) ?? null,
    resolution: t.resolution,
    createdAt: t.createdAt.toISOString().slice(0, 10),
  }));
}

export async function createTask(input: {
  type: TaskType;
  title: string;
  details?: string;
  specimenId?: string | null;
  locationId?: string | null;
  orderId?: string | null;
  auditId?: string | null;
  dueAt?: Date | null;
}): Promise<string> {
  const db = requireDb();
  const created = await db.operationsTask.create({
    data: {
      type: input.type,
      title: input.title,
      details: input.details ?? "",
      specimenId: input.specimenId ?? null,
      locationId: input.locationId ?? null,
      orderId: input.orderId ?? null,
      auditId: input.auditId ?? null,
      dueAt: input.dueAt ?? null,
    },
  });
  return created.id;
}

export async function resolveTask(id: string, resolution: string, dismiss = false): Promise<void> {
  const db = requireDb();
  await db.operationsTask.update({
    where: { id },
    data: {
      status: dismiss ? "dismissed" : "done",
      resolution,
      resolvedAt: new Date(),
    },
  });
}

export async function countOpenTasks(): Promise<number> {
  const db = requireDb();
  return db.operationsTask.count({ where: { status: { in: ["open", "in_progress"] } } });
}
