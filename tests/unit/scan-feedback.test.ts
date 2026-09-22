import { describe, expect, it } from "vitest";

import {
  checkedInCount,
  feedbackFor,
  filterRoster,
  markCheckedIn,
  nextToScan,
  sendFailedFeedback,
} from "@/features/checkin/components/scanFeedback";
import type { CheckinResult } from "@/features/checkin/schema";
import type { RosterEntry } from "@/features/registration/schema";

/**
 * What the gate shows after a scan (P-02, D24).
 *
 * Two of these are `hiraya-checkin-integrity` rules rather than presentation
 * choices: a duplicate is a success with no XP, and a scan that never reached
 * the server is not a check-in. Both are the kind of thing that looks right on
 * a happy-path click-through and is wrong at a gate with one bar of signal.
 */

const profileId = "77777777-7777-4777-8777-777777777777";
const jti = "88888888-8888-4888-8888-888888888888";

const result = (over: Partial<CheckinResult>): CheckinResult => ({
  jti,
  profileId,
  status: "accepted",
  checkinId: "99999999-9999-4999-8999-999999999999",
  xpAwarded: 10,
  reason: null,
  ...over,
});

const entry = (over: Partial<RosterEntry>): RosterEntry => ({
  profileId,
  displayName: "Ligaya Talampas",
  avatarKey: null,
  gradeLevel: 11,
  section: "ABM-A",
  status: "registered",
  waitlistPosition: null,
  checkedInAt: null,
  ...over,
});

describe("feedbackFor", () => {
  it("reports an accepted scan with what it was worth", () => {
    expect(feedbackFor(result({}))).toEqual({
      tone: "success",
      key: "result.accepted",
      xpAwarded: 10,
      counted: true,
    });
  });

  it("treats a duplicate as a fact, not a failure, and awards nothing", () => {
    // A red screen at the gate is how an officer learns to distrust the
    // scanner, and a distrusted scanner is a queue waved through unscanned.
    const feedback = feedbackFor(result({ status: "duplicate", xpAwarded: 0 }));
    expect(feedback.tone).toBe("neutral");
    expect(feedback.xpAwarded).toBe(0);
    expect(feedback.counted).toBe(true);
  });

  it("names the reason a scan was rejected", () => {
    const feedback = feedbackFor(
      result({ status: "rejected", xpAwarded: 0, checkinId: null, reason: "SCAN_OUTSIDE_EVENT_WINDOW" }),
    );
    expect(feedback.key).toBe("result.rejected.SCAN_OUTSIDE_EVENT_WINDOW");
    expect(feedback.counted).toBe(false);
  });

  it("falls back to a generic reason rather than rendering an empty message", () => {
    const feedback = feedbackFor(result({ status: "rejected", xpAwarded: 0, reason: null }));
    expect(feedback.key).toBe("result.rejected.INTERNAL");
  });

  it("does not count a scan that never reached the server", () => {
    // The jti is kept by the caller so the next tap replays this scan rather
    // than making a second one (R6). Counting it here would hide that.
    expect(sendFailedFeedback()).toEqual({
      tone: "danger",
      key: "result.notSent",
      xpAwarded: 0,
      counted: false,
    });
  });

  it("reports what the server said a scan was worth, not a constant", () => {
    // Point values are an `xp_rules` row the SSLG adviser sets (FR-5.3).
    expect(feedbackFor(result({ xpAwarded: 25 })).xpAwarded).toBe(25);
  });
});

describe("the queue at the gate", () => {
  const roster = [
    entry({ profileId: "a", displayName: "Alab", checkedInAt: "2026-09-22T01:00:00Z" }),
    entry({ profileId: "b", displayName: "Bituin" }),
    entry({ profileId: "c", displayName: "Ciara", status: "waitlisted", waitlistPosition: 1 }),
    entry({ profileId: "d", displayName: "Dalisay" }),
  ];

  it("offers the first registrant who is not in yet", () => {
    expect(nextToScan(roster)?.profileId).toBe("b");
  });

  it("skips a waitlisted learner — no place, not in the line", () => {
    const onlyWaitlist = [roster[2]!, entry({ profileId: "e", checkedInAt: "2026-09-22T01:00:00Z" })];
    expect(nextToScan(onlyWaitlist)).toBeNull();
  });

  it("marks one learner in, and leaves an existing time alone", () => {
    const after = markCheckedIn(roster, "b", "2026-09-22T02:00:00Z");
    expect(after.find((e) => e.profileId === "b")?.checkedInAt).toBe("2026-09-22T02:00:00Z");
    expect(after.find((e) => e.profileId === "a")?.checkedInAt).toBe("2026-09-22T01:00:00Z");
  });

  it("does not overwrite the arrival time of a duplicate scan", () => {
    const after = markCheckedIn(roster, "a", "2026-09-22T03:00:00Z");
    expect(after.find((e) => e.profileId === "a")?.checkedInAt).toBe("2026-09-22T01:00:00Z");
  });

  it("counts everyone who is in", () => {
    expect(checkedInCount(roster)).toBe(1);
  });

  it("finds a name however it was typed", () => {
    expect(filterRoster(roster, "  bitu ").map((e) => e.profileId)).toEqual(["b"]);
    expect(filterRoster(roster, "BITUIN").map((e) => e.profileId)).toEqual(["b"]);
  });

  it("returns the whole roster for an empty search", () => {
    expect(filterRoster(roster, "   ")).toHaveLength(roster.length);
  });
});
