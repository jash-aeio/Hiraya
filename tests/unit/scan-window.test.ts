import { describe, expect, it } from "vitest";

import {
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

function at(ms: number): Date {
  return new Date(ms);
}

describe("isWithinScanWindow", () => {
  it("accepts a scan during the event", () => {
    expect(isWithinScanWindow(new Date("2026-09-22T09:30:00.000Z"), starts, ends)).toBe(true);
  });

  it("accepts the gate opening early, up to the grace before", () => {
    expect(isWithinScanWindow(at(starts.getTime() - SCAN_WINDOW_BEFORE_MS), starts, ends)).toBe(
      true,
    );
  });

  it("refuses a scan one millisecond before the grace opens", () => {
    expect(
      isWithinScanWindow(at(starts.getTime() - SCAN_WINDOW_BEFORE_MS - 1), starts, ends),
    ).toBe(false);
  });

  it("accepts a straggler, up to the grace after", () => {
    expect(isWithinScanWindow(at(ends.getTime() + SCAN_WINDOW_AFTER_MS), starts, ends)).toBe(true);
  });

  it("refuses a scan one millisecond after the grace closes", () => {
    expect(isWithinScanWindow(at(ends.getTime() + SCAN_WINDOW_AFTER_MS + 1), starts, ends)).toBe(
      false,
    );
  });

  it("refuses a device whose clock puts the scan a day late", () => {
    // The case this rule exists for: a wrong clock must not be able to write
    // attendance for an event that finished yesterday.
    expect(isWithinScanWindow(new Date("2026-09-23T09:30:00.000Z"), starts, ends)).toBe(false);
  });

  it("refuses a device whose clock puts the scan a year early", () => {
    expect(isWithinScanWindow(new Date("2025-09-22T09:30:00.000Z"), starts, ends)).toBe(false);
  });

  it("gives an instant event a window that is still the grace wide", () => {
    // starts === ends is legal in the schema, and the grace is what makes it
    // scannable at all.
    const instant = new Date("2026-09-22T08:00:00.000Z");
    expect(isWithinScanWindow(instant, instant, instant)).toBe(true);
    expect(
      isWithinScanWindow(at(instant.getTime() + SCAN_WINDOW_AFTER_MS), instant, instant),
    ).toBe(true);
  });
});
