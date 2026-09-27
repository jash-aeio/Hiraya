import type { EventSummary } from "@/features/events/schema";

/**
 * The approval queue's decisions, as pure functions.
 *
 * Separated from the component for the reason `homeView.ts` and `boardView.ts`
 * are: the ordering here is the whole value of the screen, and a wrong order
 * looks exactly like a right one in a screenshot. An adviser opening this
 * between classes reads the first two rows and closes it.
 */

/**
 * How badly a pending event needs attention.
 *
 * `missed` is the case this screen exists to stop: an event still sitting in
 * `pending` when its date has already passed. Nobody approved it, so it never
 * published, so no learner could register and no XP could be awarded — and the
 * paper process it replaced would have surfaced that as an empty room. It is
 * not a late approval; it is an event that did not happen, and it must sort
 * above everything.
 */
export type Urgency = "missed" | "soon" | "normal";

export type QueueRow = {
  event: EventSummary;
  urgency: Urgency;
};

/** Inside this window a pending event is "soon": the adviser has two days. */
const SOON_MS = 48 * 60 * 60 * 1000;

export function urgencyOf(event: EventSummary, now: Date): Urgency {
  const starts = Date.parse(event.startsAt);
  if (Number.isNaN(starts)) return "normal";

  const delta = starts - now.getTime();
  if (delta < 0) return "missed";
  if (delta <= SOON_MS) return "soon";
  return "normal";
}

const ORDER: Record<Urgency, number> = { missed: 0, soon: 1, normal: 2 };

/**
 * The queue, ordered by what an adviser should do first.
 *
 * Missed events first (oldest first — the one that has been wrong longest),
 * then everything else by how soon it starts. Sorting on a copy rather than in
 * place: the array belongs to the caller's state, and `sort` mutating it would
 * make a re-render depend on whether this ran.
 */
export function reviewQueue(events: readonly EventSummary[], now: Date): QueueRow[] {
  return [...events]
    .map((event) => ({ event, urgency: urgencyOf(event, now) }))
    .sort((a, b) => {
      const byUrgency = ORDER[a.urgency] - ORDER[b.urgency];
      if (byUrgency !== 0) return byUrgency;

      const aStarts = Date.parse(a.event.startsAt);
      const bStarts = Date.parse(b.event.startsAt);
      if (Number.isNaN(aStarts) || Number.isNaN(bStarts)) return 0;
      return aStarts - bStarts;
    });
}

/** How many of the queue are already past their date. */
export function missedCount(rows: readonly QueueRow[]): number {
  return rows.filter((row) => row.urgency === "missed").length;
}
