import { describe, expect, it } from "vitest";

import {
  SCAN_CLOCK_AHEAD_MS,
  SCAN_MAX_SYNC_DELAY_MS,
  SCAN_WINDOW_AFTER_MS,
  SCAN_WINDOW_BEFORE_MS,
  isWithinScanWindow,
} from "@/features/checkin/service";

/**
 * The window a scan has to fall inside (D-02, FR-4.5).
 *
 * The server is authoritative here — the officer's device checks the same rule
 * only so it can answer instantly — so these boundaries decide whether a row is
 * written at all. They are tested to the millisecond because the failure they
 * guard against is a cheap Android clock running a few minutes out, and "a few
 * minutes" is exactly where an off-by-one in a comparison hides.
 */

const starts = new Date("2026-09-22T08:00:00.000Z");
const ends = new Date("2026-09-22T11:00:00.000Z");
/** Server time, during the event. Every case states it rather than implying it. */
const during = new Date("2026-09-22T09:00:00.000Z");

function at(ms: number): Date {
  return new Date(ms);
}

/**
 * The event-window half, isolated: the scan reaches the server the instant it
 * is claimed, so the clock rule below cannot decide any of these cases. Testing
 * both halves in one assertion would mean a failure never told you which rule
 * rejected the scan.
 */
function onArrival(scannedAt: Date, startsAt: Date, endsAt: Date): boolean {
  return isWithinScanWindow(scannedAt, startsAt, endsAt, scannedAt);
}

describe("isWithinScanWindow", () => {
  it("accepts a scan during the event", () => {
    expect(onArrival(new Date("2026-09-22T09:30:00.000Z"), starts, ends)).toBe(true);
  });

  it("accepts the gate opening early, up to the grace before", () => {
    expect(onArrival(at(starts.getTime() - SCAN_WINDOW_BEFORE_MS), starts, ends)).toBe(
      true,
    );
  });

  it("refuses a scan one millisecond before the grace opens", () => {
    expect(
      onArrival(at(starts.getTime() - SCAN_WINDOW_BEFORE_MS - 1), starts, ends),
    ).toBe(false);
  });

  it("accepts a straggler, up to the grace after", () => {
    expect(onArrival(at(ends.getTime() + SCAN_WINDOW_AFTER_MS), starts, ends)).toBe(true);
  });

  it("refuses a scan one millisecond after the grace closes", () => {
    expect(onArrival(at(ends.getTime() + SCAN_WINDOW_AFTER_MS + 1), starts, ends)).toBe(
      false,
    );
  });

  it("refuses a scan claimed a day outside the event", () => {
    expect(onArrival(new Date("2026-09-23T09:30:00.000Z"), starts, ends)).toBe(false);
  });

  it("refuses a scan claimed a year outside the event", () => {
    expect(onArrival(new Date("2025-09-22T09:30:00.000Z"), starts, ends)).toBe(false);
  });

  it("gives an instant event a window that is still the grace wide", () => {
    // starts === ends is legal in the schema, and the grace is what makes it
    // scannable at all.
    const instant = new Date("2026-09-22T08:00:00.000Z");
    expect(onArrival(instant, instant, instant)).toBe(true);
    expect(
      onArrival(at(instant.getTime() + SCAN_WINDOW_AFTER_MS), instant, instant),
    ).toBe(true);
  });
});

describe("the scan time against server time", () => {
  /**
   * The half that was missing. Checking `scannedAt` only against the event's
   * own window made the rule circular: a time inside the window of an event
   * that finished last term passed *because* it was inside that window. An
   * officer could therefore backdate attendance into any past event of their
   * own org, for a learner who was never there.
   */
  it("refuses a scan backdated into an event that ended months ago", () => {
    const oldStart = new Date("2026-03-02T08:00:00.000Z");
    const oldEnd = new Date("2026-03-02T11:00:00.000Z");
    const claimed = new Date("2026-03-02T09:30:00.000Z"); // inside that window

    expect(isWithinScanWindow(claimed, oldStart, oldEnd, during)).toBe(false);
  });

  it("still accepts a queue that syncs days late, because that is the normal case", () => {
    // R6: a scan is supposed to arrive long after it happened. This rule cannot
    // be tight without breaking the offline support it exists beside.
    const late = new Date(during.getTime() + SCAN_MAX_SYNC_DELAY_MS - 60_000);
    expect(isWithinScanWindow(during, starts, ends, late)).toBe(true);
  });

  it("refuses a queue that resurfaces after the sync allowance", () => {
    const tooLate = new Date(during.getTime() + SCAN_MAX_SYNC_DELAY_MS + 60_000);
    expect(isWithinScanWindow(during, starts, ends, tooLate)).toBe(false);
  });

  it("tolerates a device clock running slightly fast", () => {
    const early = new Date(during.getTime() - SCAN_CLOCK_AHEAD_MS + 60_000);
    expect(isWithinScanWindow(during, starts, ends, early)).toBe(true);
  });

  it("refuses a scan claimed further into the future than drift explains", () => {
    const wayEarly = new Date(during.getTime() - SCAN_CLOCK_AHEAD_MS - 60_000);
    expect(isWithinScanWindow(during, starts, ends, wayEarly)).toBe(false);
  });
});
