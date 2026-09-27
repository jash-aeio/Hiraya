import { describe, expect, it } from "vitest";

import type { EventSummary } from "@/features/events/schema";
import { greetingKey, joinedUpcoming, leadEvent, podium, rankReadout } from "@/features/home/homeView";
import type { LeaderboardRow, LeaderboardViewer } from "@/features/leaderboard/schema";

/**
 * The Home dashboard's decisions, tested because each is wrong in a way a
 * screenshot does not show: an event already under way rendered as "next up"
 * looks right until someone is standing outside the covered court, and a
 * learner with no points shown as rank 0 looks right until you notice that
 * nobody is rank 0.
 */

const HOUR = 60 * 60 * 1000;

function event(over: Partial<EventSummary> & { id: string }): EventSummary {
  return {
    title: "Event",
    description: null,
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    venue: null,
    capacity: null,
    status: "approved",
    org: { id: "11111111-1111-4111-8111-111111111111", name: "Org", category: "academic", logoKey: null },
    viewerRegistrationStatus: null,
    ...over,
  };
}

describe("leadEvent", () => {
  const now = new Date("2026-09-27T10:00:00.000Z");

  it("prefers the event happening now over the one starting soonest", () => {
    // The list is ordered by startsAt, so the live event is *not* first: it
    // started before the one that has not begun. Taking events[0] would show a
    // learner next week's fair while today's event is running.
    const events = [
      event({
        id: "a",
        startsAt: new Date(now.getTime() - 2 * HOUR).toISOString(),
        endsAt: new Date(now.getTime() + 2 * HOUR).toISOString(),
      }),
      event({
        id: "b",
        startsAt: new Date(now.getTime() + HOUR).toISOString(),
        endsAt: new Date(now.getTime() + 3 * HOUR).toISOString(),
      }),
    ];

    expect(leadEvent(events, now)).toMatchObject({ event: { id: "a" }, live: true });
  });

  it("falls back to the soonest event that has not started", () => {
    const events = [
      event({
        id: "b",
        startsAt: new Date(now.getTime() + HOUR).toISOString(),
        endsAt: new Date(now.getTime() + 3 * HOUR).toISOString(),
      }),
    ];

    expect(leadEvent(events, now)).toMatchObject({ event: { id: "b" }, live: false });
  });

  it("treats an event that has ended as neither live nor next", () => {
    const events = [
      event({
        id: "done",
        startsAt: new Date(now.getTime() - 4 * HOUR).toISOString(),
        endsAt: new Date(now.getTime() - HOUR).toISOString(),
      }),
    ];

    expect(leadEvent(events, now)).toBeNull();
  });

  it("counts the boundary as live, so a scan at the closing minute still reads live", () => {
    const events = [
      event({
        id: "edge",
        startsAt: new Date(now.getTime() - HOUR).toISOString(),
        endsAt: now.toISOString(),
      }),
    ];

    expect(leadEvent(events, now)).toMatchObject({ live: true });
  });

  it("skips an unparseable date instead of throwing on the whole screen", () => {
    const events = [
      event({ id: "bad", startsAt: "not-a-date", endsAt: "also-not" }),
      event({
        id: "good",
        startsAt: new Date(now.getTime() + HOUR).toISOString(),
        endsAt: new Date(now.getTime() + 2 * HOUR).toISOString(),
      }),
    ];

    expect(leadEvent(events, now)).toMatchObject({ event: { id: "good" } });
  });

  it("returns null for an empty list", () => {
    expect(leadEvent([], now)).toBeNull();
  });
});

describe("joinedUpcoming", () => {
  it("counts only the caller's registered rows", () => {
    const events = [
      event({ id: "a", viewerRegistrationStatus: "registered" }),
      event({ id: "b", viewerRegistrationStatus: "cancelled" }),
      event({ id: "c", viewerRegistrationStatus: null }),
      event({ id: "d", viewerRegistrationStatus: "registered" }),
    ];

    expect(joinedUpcoming(events)).toBe(2);
  });

  it("is zero, not null, when nothing is joined", () => {
    expect(joinedUpcoming([event({ id: "a" })])).toBe(0);
  });
});

describe("podium", () => {
  const row = (rank: number): LeaderboardRow => ({
    rank,
    profileId: `2222222${rank}-2222-4222-8222-222222222222`,
    displayName: `Learner ${rank}`,
    avatarKey: null,
    gradeLevel: null,
    section: null,
    xp: 100 - rank,
    levelTitle: null,
    isViewer: false,
  });

  it("takes the top three", () => {
    expect(podium([row(1), row(2), row(3), row(4)]).map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("renders however many exist rather than padding to three", () => {
    // Early in a season two people have points. Placeholder rows would look
    // like people who are not there.
    expect(podium([row(1), row(2)])).toHaveLength(2);
  });
});

describe("rankReadout", () => {
  const viewer = (over: Partial<LeaderboardViewer>): LeaderboardViewer => ({
    profileId: "33333333-3333-4333-8333-333333333333",
    rank: 4,
    xp: 40,
    levelTitle: null,
    hidden: false,
    ...over,
  });

  it("reports a rank when there is one", () => {
    expect(rankReadout(viewer({ rank: 4 }))).toEqual({ kind: "ranked", rank: 4 });
  });

  it("says unranked rather than rank 0 when the learner has no points", () => {
    expect(rankReadout(viewer({ rank: null }))).toEqual({ kind: "unranked" });
  });

  it("still gives a hidden learner their own rank (FR-5.7)", () => {
    // Hiding is about the public board, not about withholding someone's
    // position from themselves.
    expect(rankReadout(viewer({ hidden: true, rank: 7 }))).toEqual({ kind: "ranked", rank: 7 });
  });

  it("is unranked when the board could not be read at all", () => {
    expect(rankReadout(null)).toEqual({ kind: "unranked" });
  });
});

describe("greetingKey", () => {
  it("splits the day at noon and six", () => {
    expect(greetingKey(0)).toBe("morning");
    expect(greetingKey(11)).toBe("morning");
    expect(greetingKey(12)).toBe("afternoon");
    expect(greetingKey(17)).toBe("afternoon");
    expect(greetingKey(18)).toBe("evening");
    expect(greetingKey(23)).toBe("evening");
  });
});
