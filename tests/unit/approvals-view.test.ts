import { describe, expect, it } from "vitest";

import { missedCount, reviewQueue, urgencyOf } from "@/features/approvals/approvalsView";
import type { EventSummary } from "@/features/events/schema";

/**
 * The approval queue's ordering, which is the whole value of the screen and is
 * invisible in a screenshot. An adviser opening this between classes reads the
 * first two rows and closes it, so what sits in those two rows is the feature.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function event(id: string, startsInMs: number, now: Date): EventSummary {
  const starts = new Date(now.getTime() + startsInMs);
  return {
    id,
    title: `Event ${id}`,
    description: null,
    startsAt: starts.toISOString(),
    endsAt: new Date(starts.getTime() + 2 * HOUR).toISOString(),
    venue: null,
    capacity: null,
    status: "pending",
    org: { id: "11111111-1111-4111-8111-111111111111", name: "Org", category: "academic", logoKey: null },
    viewerRegistrationStatus: null,
  };
}

const now = new Date("2026-09-27T09:00:00.000Z");

describe("urgencyOf", () => {
  it("calls a pending event whose date has passed 'missed'", () => {
    // Not "late": nobody approved it, so it never published, so no learner
    // could register and no XP could be awarded. The event did not happen.
    expect(urgencyOf(event("a", -DAY, now), now)).toBe("missed");
  });

  it("calls anything starting within two days 'soon'", () => {
    expect(urgencyOf(event("b", 6 * HOUR, now), now)).toBe("soon");
    expect(urgencyOf(event("c", 47 * HOUR, now), now)).toBe("soon");
  });

  it("calls anything further out 'normal'", () => {
    expect(urgencyOf(event("d", 5 * DAY, now), now)).toBe("normal");
  });

  it("does not throw on an unparseable date", () => {
    const broken = { ...event("e", DAY, now), startsAt: "not-a-date" };
    expect(urgencyOf(broken, now)).toBe("normal");
  });
});

describe("reviewQueue", () => {
  it("puts missed events first, then soonest", () => {
    const rows = reviewQueue(
      [event("far", 5 * DAY, now), event("soon", 3 * HOUR, now), event("missed", -2 * DAY, now)],
      now,
    );

    expect(rows.map((r) => r.event.id)).toEqual(["missed", "soon", "far"]);
  });

  it("orders several missed events oldest first", () => {
    // The one that has been wrong longest is the one to chase.
    const rows = reviewQueue([event("recent", -DAY, now), event("ancient", -10 * DAY, now)], now);
    expect(rows.map((r) => r.event.id)).toEqual(["ancient", "recent"]);
  });

  it("does not mutate the array it was given", () => {
    // It belongs to the caller's React state; an in-place sort would make a
    // re-render depend on whether this function had run.
    const input = [event("b", 2 * DAY, now), event("a", -DAY, now)];
    const before = input.map((e) => e.id);
    reviewQueue(input, now);
    expect(input.map((e) => e.id)).toEqual(before);
  });

  it("is empty for an empty queue rather than throwing", () => {
    expect(reviewQueue([], now)).toEqual([]);
  });
});

describe("missedCount", () => {
  it("counts only the events past their date", () => {
    const rows = reviewQueue(
      [event("a", -DAY, now), event("b", -3 * DAY, now), event("c", 2 * DAY, now)],
      now,
    );
    expect(missedCount(rows)).toBe(2);
  });

  it("is zero on a healthy queue", () => {
    expect(missedCount(reviewQueue([event("a", 2 * DAY, now)], now))).toBe(0);
  });
});
