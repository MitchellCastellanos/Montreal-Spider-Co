import "server-only";

/**
 * Logs when a database read fails and we fall back to the static seed.
 * Keeps the build/runtime resilient when the DB isn't migrated yet or is
 * temporarily unreachable (e.g. before `db:push`/`db:seed` have been run).
 */
export function logDbFallback(scope: string, e: unknown): void {
  console.warn(`[data] ${scope}: database unavailable, using fallback —`, e instanceof Error ? e.message : e);
}
