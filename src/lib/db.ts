import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma is only instantiated when a DATABASE_URL is configured. When it isn't
 * (e.g. local dev before Supabase is connected), `prisma` is null and the data
 * layer transparently falls back to the static seed catalog.
 */
export const hasDatabase = Boolean(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient | null = hasDatabase
  ? globalForPrisma.prisma ?? new PrismaClient()
  : null;

if (hasDatabase && prisma && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
