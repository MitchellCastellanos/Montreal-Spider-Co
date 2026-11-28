/**
 * Rotation of made-to-order offers: a limited number of slots, kept by the offers whose listings get the
 * MOST visits; the least-visited offers are the ones rotated out. Minimum display time prevents flapping. Pure — no I/O.
 */

export interface RotationOffer {
  id: string;
  productId: string;
  published: boolean;
  publishedAt: Date | null;
  rotates: boolean;
  pinned: boolean;
  /** Passes the profit gate (margin + minimum profit) at its current price/cost. Hard requirement. */
  eligible: boolean;
}

export interface RotationPlan {
  /** Offers to make visible. */
  publish: string[];
  /** Offers to hide. */
  unpublish: string[];
  /** Why each decision was made, for the admin. */
  reasons: Record<string, string>;
  slots: number;
  /** Offers visible after the plan is applied. */
  visibleAfter: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function planRotation(input: {
  offers: RotationOffer[];
  /** Page views per productId over the lookback window. */
  visitsByProduct: Record<string, number>;
  slots: number;
  /** Minimum days an offer stays visible before it may be rotated out. */
  minDays: number;
  now: Date;
}): RotationPlan {
  const { offers, visitsByProduct, now } = input;
  const slots = Math.max(0, Math.floor(input.slots));
  const reasons: Record<string, string> = {};
  const publish = new Set<string>();
  const unpublish = new Set<string>();
  const keep = new Set<string>(); // visible after, already decided
  const visits = (o: RotationOffer) => visitsByProduct[o.productId] ?? 0;

  // 1) Hard gate: an offer that no longer earns enough is hidden, whatever else is true.
  const eligible: RotationOffer[] = [];
  for (const o of offers) {
    if (!o.eligible) {
      if (o.published) {
        unpublish.add(o.id);
        reasons[o.id] = "Below the profit target — hidden";
      }
      continue;
    }
    eligible.push(o);
  }

  // 2) Fixed occupants: pinned, non-rotating that are already visible, and offers still inside their minimum display time.
  const candidates: RotationOffer[] = [];
  for (const o of eligible) {
    const locked = o.published && !!o.publishedAt && now.getTime() - o.publishedAt.getTime() < input.minDays * DAY_MS;
    if (o.pinned) {
      keep.add(o.id);
      if (!o.published) publish.add(o.id);
      reasons[o.id] = "Pinned";
    } else if (!o.rotates) {
      if (o.published) {
        keep.add(o.id);
        reasons[o.id] = "Not rotating (kept as is)";
      }
    } else if (locked) {
      keep.add(o.id);
      reasons[o.id] = "Minimum display time not reached";
    } else {
      candidates.push(o);
    }
  }

  // 3) Fill the remaining slots with the MOST visited candidates. Ties keep what is already visible (no churn
  //    for nothing), then fall back to id so the result is deterministic.
  const free = Math.max(0, slots - keep.size);
  candidates.sort(
    (a, b) => visits(b) - visits(a) || Number(b.published) - Number(a.published) || a.id.localeCompare(b.id),
  );
  candidates.forEach((o, i) => {
    if (i < free) {
      keep.add(o.id);
      reasons[o.id] = `Most visits (${visits(o)} views)`;
      if (!o.published) publish.add(o.id);
    } else if (o.published) {
      unpublish.add(o.id);
      reasons[o.id] = `Rotated out — only ${visits(o)} views, others get more`;
    }
  });

  // Pinned offers may exceed the slot count; that is the admin's explicit choice.
  return { publish: [...publish], unpublish: [...unpublish], reasons, slots, visibleAfter: keep.size };
}
