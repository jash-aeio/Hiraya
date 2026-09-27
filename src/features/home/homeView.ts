import type { EventSummary } from "@/features/events/schema";
import type { LeaderboardRow, LeaderboardViewer } from "@/features/leaderboard/schema";

/**
 * The Home dashboard's decisions, as pure functions.
 *
 * Separated from the component for the reason `boardView.ts` and `xpView.ts`
 * are: each of these is quietly wrong in a way a rendered screenshot does not
 * show. An event that is *happening now* rendered as "next up" reads as correct
 * until someone is standing outside the covered court; a learner with no points
 * shown as rank 0 reads as correct until you notice nobody is rank 0.
 */

/** Whether the event the dashboard leads with is already under way. */
export type LeadEvent = {
  event: EventSummary;
  /** `now` falls inside [startsAt, endsAt] — the card says "happening now". */
  live: boolean;
};

/**
 * The one event Home leads with: the live one if there is one, else the soonest
 * to start.
 *
 * `/api/v1/events?scope=upcoming` already orders by `startsAt` ascending and
 * returns anything that has not *ended*, so a session that started an hour ago
 * and runs until noon is in the list and is not first. Taking `events[0]` would
 * therefore show a learner next week's fair while today's event is running,
 * which is the one moment this screen has a job to do.
 */
export function leadEvent(events: readonly EventSummary[], now: Date): LeadEvent | null {
  const time = now.getTime();

  for (const event of events) {
    const starts = Date.parse(event.startsAt);
    const ends = Date.parse(event.endsAt);
    if (Number.isNaN(starts) || Number.isNaN(ends)) continue;
    if (starts <= time && time <= ends) return { event, live: true };
  }

  for (const event of events) {
    const starts = Date.parse(event.startsAt);
    if (Number.isNaN(starts)) continue;
    if (starts > time) return { event, live: false };
  }

  return null;
}

/**
 * How many of the listed upcoming events this learner has registered for.
 *
 * Counted over the list the screen was handed, and the label says "upcoming" for
 * exactly that reason — it is not a lifetime total and must not be read as one.
 * `viewerRegistrationStatus` is the caller's own row; nobody else's is readable
 * under the registrations policy, so this can never become a fill count.
 */
export function joinedUpcoming(events: readonly EventSummary[]): number {
  return events.filter((event) => event.viewerRegistrationStatus === "registered").length;
}

/**
 * The top three, for the podium.
 *
 * Fewer than three is normal early in a season and renders as however many
 * there are, rather than padding with placeholders that look like people.
 */
export function podium(rows: readonly LeaderboardRow[]): readonly LeaderboardRow[] {
  return rows.slice(0, 3);
}

export type RankReadout =
  | { kind: "ranked"; rank: number }
  /** On the board's terms: no points yet, so no rank. Never rendered as 0. */
  | { kind: "unranked" };

/**
 * The learner's own standing.
 *
 * A hidden learner still sees their own rank (FR-5.7) — hiding is about the
 * public board, not about withholding someone's own position from them. That is
 * why `hidden` is not consulted here: the viewer object is the viewer's.
 */
export function rankReadout(viewer: LeaderboardViewer | null): RankReadout {
  if (!viewer || viewer.rank === null) return { kind: "unranked" };
  return { kind: "ranked", rank: viewer.rank };
}

/**
 * Which greeting to use, from the hour on the learner's own device.
 *
 * Bands rather than a clock: "Good evening" at 23:00 is fine, and anything more
 * precise would be a translation problem in six languages for no gain. The
 * boundaries are the ones Filipino and English share — morning until noon,
 * afternoon until 18:00.
 */
export function greetingKey(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
