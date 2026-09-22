import { describe, expect, it } from "vitest";

import {
  eventFullDetailsSchema,
  listRosterQuerySchema,
  notEligibleDetailsSchema,
  registerEventBodySchema,
  registrationSchema,
} from "@/features/registration/schema";
import { eventDetailSchema } from "@/features/events/schema";
import { checkinResultSchema, recordCheckinBodySchema } from "@/features/checkin/schema";
import { listXpQuerySchema, xpEntrySchema } from "@/features/xp/schema";
import { leaderboardQuerySchema, leaderboardResponseSchema } from "@/features/leaderboard/schema";

/**
 * The Phase 0 contracts (J-01…J-04, docs/WORKSTREAMS.md §5).
 *
 * These schemas are the handshake between the two lanes, so what is tested here
 * is not "Zod works" but the few places where a wrong shape would be
 * *invisible*: a query parameter that arrives as a string, a default that
 * decides a product rule, and a field that must stay nullable because a real
 * case produces null.
 */

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("registration contract", () => {
  it("does not join a waitlist unless the learner asked", () => {
    // US-2: a full event is a refusal with an offer, never a silent downgrade.
    expect(registerEventBodySchema.parse({})).toEqual({ acceptWaitlist: false });
  });

  it("keeps a waitlist position off a registered row", () => {
    const registered = registrationSchema.parse({
      eventId: uuid(1),
      status: "registered",
      waitlistPosition: null,
      registeredAt: "2026-09-22T01:00:00Z",
    });
    expect(registered.waitlistPosition).toBeNull();
  });

  it("refuses a waitlist position of zero — the number a learner reads is 1-based", () => {
    expect(() =>
      registrationSchema.parse({
        eventId: uuid(1),
        status: "waitlisted",
        waitlistPosition: 0,
        registeredAt: "2026-09-22T01:00:00Z",
      }),
    ).toThrow();
  });

  it("carries the offer alongside the refusal", () => {
    const details = eventFullDetailsSchema.parse({ capacity: 40, waitlistAvailable: true });
    expect(details.waitlistAvailable).toBe(true);
  });

  it("names one criterion, and accepts the event's own rule beside it", () => {
    const details = notEligibleDetailsSchema.parse({
      criterion: "grade_level",
      allowedGradeLevels: [9, 10],
    });
    expect(details.criterion).toBe("grade_level");
    expect(() => notEligibleDetailsSchema.parse({ criterion: "vibes" })).toThrow();
  });

  it("coerces the roster limit, which arrives as a string", () => {
    expect(listRosterQuerySchema.parse({ limit: "25" }).limit).toBe(25);
    expect(listRosterQuerySchema.parse({}).limit).toBe(100);
  });
});

describe("event detail contract", () => {
  const base = {
    id: uuid(2),
    title: "Clean-up drive",
    description: null,
    startsAt: "2026-09-23T00:00:00Z",
    endsAt: "2026-09-23T03:00:00Z",
    venue: null,
    capacity: null,
    status: "approved",
    org: { id: uuid(3), name: "Science Club", category: "service", logoKey: null },
    viewerRegistrationStatus: null,
  };

  it("defaults an empty eligibility rule to open-to-everyone", () => {
    const detail = eventDetailSchema.parse({
      ...base,
      eligibility: {},
      registrationOpen: true,
      viewerRegistration: null,
    });
    expect(detail.eligibility).toEqual({ gradeLevels: [], sections: [], orgIds: [] });
  });

  it("publishes no fill count — capacity only", () => {
    // Deliberate: a "spots left" would have to outrank the registrations
    // policy. See the note in features/events/schema.ts.
    expect(Object.keys(eventDetailSchema.shape)).not.toContain("registeredCount");
  });
});

describe("check-in contract", () => {
  const scan = {
    eventId: uuid(4),
    profileId: uuid(5),
    jti: uuid(6),
    scannedAt: "2026-09-23T01:15:00Z",
  };

  it("defaults to an officer scanning an arrival", () => {
    const parsed = recordCheckinBodySchema.parse(scan);
    expect(parsed).toMatchObject({ direction: "in", method: "officer_scan" });
  });

  it("requires the jti, because a server-generated id would make every retry a new check-in", () => {
    const { jti: _jti, ...withoutJti } = scan;
    expect(() => recordCheckinBodySchema.parse(withoutJti)).toThrow();
  });

  it("has no token field in Phase 0 (D24, R5)", () => {
    expect(Object.keys(recordCheckinBodySchema.shape)).not.toContain("token");
  });

  it("treats a duplicate as a result, not an error, and awards nothing for it", () => {
    const result = checkinResultSchema.parse({
      jti: uuid(6),
      profileId: uuid(5),
      status: "duplicate",
      checkinId: uuid(7),
      xpAwarded: 0,
      reason: null,
    });
    expect(result.status).toBe("duplicate");
    expect(result.xpAwarded).toBe(0);
  });

  it("refuses negative XP on a scan — a correction is a reversal row, not an award", () => {
    expect(() =>
      checkinResultSchema.parse({
        jti: uuid(6),
        profileId: uuid(5),
        status: "accepted",
        checkinId: uuid(7),
        xpAwarded: -10,
        reason: null,
      }),
    ).toThrow();
  });
});

describe("xp contract", () => {
  it("reads lifetime by default", () => {
    expect(listXpQuerySchema.parse({})).toEqual({ window: "lifetime", limit: 50 });
  });

  it("allows a negative delta, because a reversal is a row", () => {
    const reversal = xpEntrySchema.parse({
      id: uuid(8),
      delta: -10,
      sourceType: "reversal",
      participationType: null,
      reversalOf: uuid(9),
      reason: "Dispute upheld",
      createdAt: "2026-09-22T02:00:00Z",
      source: null,
    });
    expect(reversal.delta).toBe(-10);
  });

  it("lets an award cite the check-in behind it", () => {
    const award = xpEntrySchema.parse({
      id: uuid(10),
      delta: 10,
      sourceType: "checkin",
      participationType: "attend_event",
      reversalOf: null,
      reason: null,
      createdAt: "2026-09-22T02:00:00Z",
      source: {
        checkinId: uuid(11),
        eventId: uuid(4),
        eventTitle: "Clean-up drive",
        orgName: "Science Club",
        occurredAt: "2026-09-23T01:15:00Z",
      },
    });
    expect(award.source?.checkinId).toBe(uuid(11));
  });
});

describe("leaderboard contract", () => {
  it("defaults to the school board", () => {
    expect(leaderboardQuerySchema.parse({})).toMatchObject({ scope: "school", limit: 20 });
  });

  it("accepts the four scopes and nothing else", () => {
    for (const scope of ["section", "grade", "org", "school"]) {
      expect(leaderboardQuerySchema.parse({ scope }).scope).toBe(scope);
    }
    expect(() => leaderboardQuerySchema.parse({ scope: "national" })).toThrow();
  });

  it("returns the viewer's own standing even when they are absent from the rows (FR-5.8)", () => {
    const board = leaderboardResponseSchema.parse({
      scope: "school",
      scopeRef: null,
      season: null,
      rows: [],
      viewer: { profileId: uuid(5), rank: 41, xp: 120, levelTitle: "Lingkod", hidden: true },
      computedAt: "2026-09-22T02:00:00Z",
    });
    expect(board.rows).toHaveLength(0);
    expect(board.viewer?.rank).toBe(41);
  });

  it("allows a null rank for a learner with no XP yet", () => {
    const viewer = leaderboardResponseSchema.parse({
      scope: "section",
      scopeRef: "7-Sampaguita",
      season: null,
      rows: [],
      viewer: { profileId: uuid(5), rank: null, xp: 0, levelTitle: null, hidden: false },
      computedAt: "2026-09-22T02:00:00Z",
    }).viewer;
    expect(viewer?.rank).toBeNull();
  });
});
