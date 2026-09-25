import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  callAwardCheckinXp,
  insertCheckin,
  selectExistingCheckin,
} from "../../src/features/checkin/queries";

import { asUser, asUserThroughDrizzle, startTestDatabase } from "./helpers/db";
import type { TestClaims, TestDatabase } from "./helpers/db";
import { seedTenant } from "./helpers/fixtures";
import type { Tenant } from "./helpers/fixtures";

/**
 * Check-in and the XP it earns (D-02, D18, FR-4.5, FR-4.9).
 *
 * One of the two non-negotiable tests in CLAUDE.md §5 lives here: **replaying
 * an entire offline scan queue produces zero duplicate XP.** The other, the
 * cross-tenant denial, is in rls.test.ts and is extended here to the one path
 * that writes points.
 *
 * These drive SQL directly rather than the service, for the reason
 * events.test.ts gives: the guarantees under test are constraints, policies and
 * a SECURITY DEFINER function, and a test that went through the service would
 * be testing the service's opinion of them. The statements below are the ones
 * `src/features/checkin/queries.ts` issues.
 */

let db: TestDatabase;
let schoolA: Tenant;
let schoolB: Tenant;

/** An event of schoolA's org, running right now. */
let liveEventId: string;
let learnerId: string;
/** The officer who holds the scanner: an org_officer of the hosting org. */
let officer: TestClaims;
/**
 * The other kind of officer: school-wide, an officer of no organization, and a
 * learner. This is who staffs a Club Fair, and D-08 is what happened because no
 * test had ever held the scanner as them.
 */
let sslgOfficer: TestClaims;

const ATTEND_XP = 10;

beforeAll(async () => {
  db = await startTestDatabase();
  schoolA = await seedTenant(db.sql, "chk-a");
  schoolB = await seedTenant(db.sql, "chk-b");
  learnerId = schoolA.learnerProfileId;

  officer = {
    schoolId: schoolA.schoolId,
    profileId: schoolA.adminProfileId,
    roles: ["org_officer"],
    orgGrants: [{ orgId: schoolA.orgId, role: "org_officer" }],
  };

  const [event] = await db.sql<{ id: string }[]>`
    INSERT INTO events (school_id, org_id, title, starts_at, ends_at, status, publish_at)
    VALUES (${schoolA.schoolId}, ${schoolA.orgId}, 'Fixture Live Assembly',
            now() - interval '1 hour', now() + interval '2 hours', 'approved', now())
    RETURNING id
  `;
  liveEventId = event!.id;

  // A point value has to be in force for an award to be worth anything. The
  // fixture seeds xp_rules, so make the attendance value explicit and current.
  await db.sql`
    INSERT INTO xp_rules (school_id, participation_type, xp_value, effective_from)
    VALUES (${schoolA.schoolId}, 'attend_event', ${ATTEND_XP}, now() - interval '30 days')
  `;

  const [sslg] = await db.sql<{ id: string }[]>`
    INSERT INTO profiles (school_id, username, display_name, grade_level, section, status)
    VALUES (${schoolA.schoolId}, 'chk-a-sslg', 'Fixture SSLG Officer', 12, 'STEM-B', 'active')
    RETURNING id
  `;
  sslgOfficer = {
    schoolId: schoolA.schoolId,
    profileId: sslg!.id,
    roles: ["learner", "sslg_officer"],
    // An officer of no organization, which is the point: the school-wide role is
    // their only claim to the gate.
    orgGrants: [],
  };
}, 300_000);

afterAll(async () => {
  await db?.sql?.end();
  await db?.stop();
});

/**
 * One scan, exactly as `src/features/checkin/queries.ts` performs it: insert
 * with ON CONFLICT DO NOTHING, then award through the function. Returns the xp
 * the award reported, or null when the constraint absorbed the scan.
 */
async function scan(
  claims: TestClaims,
  eventId: string,
  profileId: string,
  jti: string,
): Promise<{ checkinId: string | null; xp: number | null }> {
  return asUser(db.sql, claims, async (tx) => {
    const inserted = await tx<{ id: string }[]>`
      INSERT INTO checkins (school_id, event_id, profile_id, jti, scanned_at, synced_at,
                            device_id, method, direction, recorded_by)
      VALUES (${claims.schoolId}, ${eventId}, ${profileId}, ${jti}, now(), now(),
              'fixture-scanner', 'officer_scan', 'in', ${claims.profileId})
      ON CONFLICT (event_id, profile_id, jti) DO NOTHING
      RETURNING id
    `;

    const checkinId = inserted[0]?.id ?? null;
    if (!checkinId) return { checkinId: null, xp: null };

    const [awarded] = await tx<{ awarded: number }[]>`
      SELECT public.award_checkin_xp(${checkinId}::uuid) AS awarded
    `;
    return { checkinId, xp: awarded!.awarded };
  });
}

async function ledgerTotal(profileId: string): Promise<number> {
  const [row] = await db.sql<{ total: number }[]>`
    SELECT COALESCE(SUM(delta), 0)::int AS total FROM xp_ledger WHERE profile_id = ${profileId}
  `;
  return row!.total;
}

async function checkinCount(eventId: string, profileId: string): Promise<number> {
  const [row] = await db.sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM checkins
    WHERE event_id = ${eventId} AND profile_id = ${profileId}
  `;
  return row!.count;
}

describe("a scan becomes a point", () => {
  /** The check-in the two tests below audit. `seedTenant` already leaves one
   * ledger row on this learner, so every assertion here is relative to what was
   * there before rather than to zero. */
  let firstCheckinId: string;

  it("writes the attendance row and the ledger row together, at the value in force", async () => {
    const before = await ledgerTotal(learnerId);
    const result = await scan(officer, liveEventId, learnerId, randomUUID());

    expect(result.checkinId).not.toBeNull();
    expect(result.xp).toBe(ATTEND_XP);
    expect(await ledgerTotal(learnerId)).toBe(before + ATTEND_XP);

    firstCheckinId = result.checkinId!;
  });

  it("cites the check-in it came from, so any point can be audited back to a scan", async () => {
    const [row] = await db.sql<{
      source_type: string;
      source_id: string;
      participation_type: string;
      awarded_by: string | null;
      season_id: string | null;
    }[]>`
      SELECT source_type, source_id, participation_type, awarded_by, season_id
      FROM xp_ledger WHERE source_type = 'checkin' AND source_id = ${firstCheckinId}
    `;

    expect(row!.source_type).toBe("checkin");
    expect(row!.participation_type).toBe("attend_event");
    // Awarded by the school's rule, not by a person. The adviser paths that do
    // carry a decision fill this, and are audited for that difference.
    expect(row!.awarded_by).toBeNull();
    expect(row!.season_id).not.toBeNull();

    const [checkin] = await db.sql<{ event_id: string }[]>`
      SELECT event_id FROM checkins WHERE id = ${row!.source_id}
    `;
    expect(checkin!.event_id).toBe(liveEventId);
  });
});

describe("replaying a scan", () => {
  it("is a no-op when the same jti arrives again (R6)", async () => {
    const jti = randomUUID();
    const first = await scan(officer, liveEventId, learnerId, jti);
    const replay = await scan(officer, liveEventId, learnerId, jti);

    expect(first.checkinId).not.toBeNull();
    // The unique constraint absorbed it: no row, and therefore no award call.
    expect(replay.checkinId).toBeNull();
  });

  it("records a second genuine scan but awards nothing more", async () => {
    const before = await ledgerTotal(learnerId);
    const countBefore = await checkinCount(liveEventId, learnerId);

    // A different jti: a second gate, or a learner stepping back in. The row is
    // real — attendance is a record of what happened — and it is worth nothing.
    const second = await scan(officer, liveEventId, learnerId, randomUUID());

    expect(second.checkinId).not.toBeNull();
    expect(second.xp).toBe(0);
    expect(await ledgerTotal(learnerId)).toBe(before);
    expect(await checkinCount(liveEventId, learnerId)).toBe(countBefore + 1);
  });
});

describe("replaying a whole queue", () => {
  /**
   * CLAUDE.md §5, non-negotiable test 2.
   *
   * An offline queue is replayed in full, not selectively: a device that lost
   * its connection mid-sync does not know which scans landed, so it sends all
   * of them again. If that produced a second award for anybody, every
   * leaderboard in the school would be wrong and no adviser could say by how
   * much.
   */
  it("produces zero duplicate XP", async () => {
    const [event] = await db.sql<{ id: string }[]>`
      INSERT INTO events (school_id, org_id, title, starts_at, ends_at, status, publish_at)
      VALUES (${schoolA.schoolId}, ${schoolA.orgId}, 'Fixture Queue Replay Rally',
              now() - interval '30 minutes', now() + interval '2 hours', 'approved', now())
      RETURNING id
    `;
    const eventId = event!.id;

    // Forty learners, one queued scan each — a realistic gate.
    const queue: { profileId: string; jti: string }[] = [];
    for (let i = 0; i < 40; i += 1) {
      const [row] = await db.sql<{ id: string }[]>`
        INSERT INTO profiles (school_id, username, display_name, grade_level, section, status)
        VALUES (${schoolA.schoolId}, ${`chk-a-queued-${String(i)}`},
                ${`Fixture Queued ${String(i)}`}, 8, 'Rosal', 'active')
        RETURNING id
      `;
      queue.push({ profileId: row!.id, jti: randomUUID() });
    }

    for (const item of queue) {
      await scan(officer, eventId, item.profileId, item.jti);
    }

    const [afterFirst] = await db.sql<{ checkins: number; awarded: number }[]>`
      SELECT
        (SELECT count(*)::int FROM checkins WHERE event_id = ${eventId}) AS checkins,
        (SELECT COALESCE(SUM(l.delta), 0)::int FROM xp_ledger l
          JOIN checkins c ON c.id = l.source_id
         WHERE c.event_id = ${eventId}) AS awarded
    `;
    expect(afterFirst!.checkins).toBe(40);
    expect(afterFirst!.awarded).toBe(40 * ATTEND_XP);

    // The whole queue again, twice, in a different order each time — which is
    // what a retrying device actually does.
    for (const item of [...queue].reverse()) {
      await scan(officer, eventId, item.profileId, item.jti);
    }
    for (const item of queue) {
      await scan(officer, eventId, item.profileId, item.jti);
    }

    const [afterReplay] = await db.sql<{ checkins: number; awarded: number }[]>`
      SELECT
        (SELECT count(*)::int FROM checkins WHERE event_id = ${eventId}) AS checkins,
        (SELECT COALESCE(SUM(l.delta), 0)::int FROM xp_ledger l
          JOIN checkins c ON c.id = l.source_id
         WHERE c.event_id = ${eventId}) AS awarded
    `;

    expect(afterReplay!.checkins).toBe(40);
    expect(afterReplay!.awarded).toBe(40 * ATTEND_XP);
  });
});

describe("an event no adviser approved", () => {
  /**
   * The approval gate, which nothing else on this path enforces.
   *
   * `checkins_insert_hosts` asks for an org grant, not a status, and the
   * scanner's picker filters on `approved` as a *listing* decision. An org
   * officer is a learner: they can file a proposal, have it rejected, and still
   * hold the grant that lets them write attendance for their own org. Without
   * this rule they could mint points against an event that was never allowed to
   * happen — which is the approval control itself, not the colluding-officer
   * risk the threat model already accepts (T2).
   */
  it("is worth no points, even to an officer who may write its attendance", async () => {
    const [rejected] = await db.sql<{ id: string }[]>`
      INSERT INTO events (school_id, org_id, title, starts_at, ends_at, status, publish_at)
      VALUES (${schoolA.schoolId}, ${schoolA.orgId}, 'Fixture Rejected Outreach',
              now() - interval '1 hour', now() + interval '2 hours', 'rejected', NULL)
      RETURNING id
    `;

    const before = await ledgerTotal(learnerId);
    const result = await scan(officer, rejected!.id, learnerId, randomUUID());

    // The attendance row stands — a scan is a record of something that
    // happened — and it is worth nothing.
    expect(result.checkinId).not.toBeNull();
    expect(result.xp).toBe(0);
    expect(await ledgerTotal(learnerId)).toBe(before);
  });

  it("is worth no points while it is still only a draft", async () => {
    const [draft] = await db.sql<{ id: string }[]>`
      INSERT INTO events (school_id, org_id, title, starts_at, ends_at, status, publish_at)
      VALUES (${schoolA.schoolId}, ${schoolA.orgId}, 'Fixture Draft Rally',
              now() - interval '1 hour', now() + interval '2 hours', 'draft', NULL)
      RETURNING id
    `;

    const before = await ledgerTotal(learnerId);
    const result = await scan(officer, draft!.id, learnerId, randomUUID());

    expect(result.xp).toBe(0);
    expect(await ledgerTotal(learnerId)).toBe(before);
  });
});

describe("who may turn a scan into a point", () => {
  it("refuses a learner calling the award function on their own check-in", async () => {
    const [checkin] = await db.sql<{ id: string }[]>`
      SELECT id FROM checkins WHERE event_id = ${liveEventId} AND profile_id = ${learnerId} LIMIT 1
    `;

    await expect(
      asUser(
        db.sql,
        { schoolId: schoolA.schoolId, profileId: learnerId, roles: ["learner"] },
        async (tx) => tx`SELECT public.award_checkin_xp(${checkin!.id}::uuid)`,
      ),
    ).rejects.toThrow(/not an officer or adviser/);
  });

  it("refuses an officer of a different organization in the same school", async () => {
    const [otherOrg] = await db.sql<{ id: string }[]>`
      INSERT INTO organizations (school_id, name, slug, category)
      VALUES (${schoolA.schoolId}, 'Fixture Other Club', 'chk-a-other', 'arts')
      RETURNING id
    `;
    const [checkin] = await db.sql<{ id: string }[]>`
      SELECT id FROM checkins WHERE event_id = ${liveEventId} LIMIT 1
    `;

    await expect(
      asUser(
        db.sql,
        {
          schoolId: schoolA.schoolId,
          profileId: schoolA.adminProfileId,
          roles: ["org_officer"],
          orgGrants: [{ orgId: otherOrg!.id, role: "org_officer" }],
        },
        async (tx) => tx`SELECT public.award_checkin_xp(${checkin!.id}::uuid)`,
      ),
    ).rejects.toThrow(/not an officer or adviser/);
  });

  it("refuses an officer of another school outright (R1)", async () => {
    const [checkin] = await db.sql<{ id: string }[]>`
      SELECT id FROM checkins WHERE event_id = ${liveEventId} LIMIT 1
    `;

    await expect(
      asUser(
        db.sql,
        {
          schoolId: schoolB.schoolId,
          profileId: schoolB.adminProfileId,
          roles: ["school_admin"],
        },
        async (tx) => tx`SELECT public.award_checkin_xp(${checkin!.id}::uuid)`,
      ),
    ).rejects.toThrow(/no such check-in in this school/);
  });

  it("gives an officer's session no other way into the ledger", async () => {
    // The whole reason award_checkin_xp exists: the INSERT policy on xp_ledger
    // admits School Admin and the SSLG adviser only, so a scanner device cannot
    // become an XP faucet (threat T2).
    await expect(
      asUser(
        db.sql,
        officer,
        async (tx) => tx`
          INSERT INTO xp_ledger (school_id, profile_id, delta, source_type)
          VALUES (${schoolA.schoolId}, ${learnerId}, 500, 'manual_adjustment')
        `,
      ),
    ).rejects.toThrow();
  });

  it("keeps the ledger append-only even for the officer who wrote the row", async () => {
    await expect(
      asUser(
        db.sql,
        officer,
        async (tx) => tx`UPDATE xp_ledger SET delta = 999 WHERE profile_id = ${learnerId}`,
      ),
    ).rejects.toThrow();
  });
});

describe("a school-wide SSLG officer at the gate (D-08)", () => {
  /**
   * The role that could write attendance and not read it.
   *
   * `checkins_insert_hosts` admits `sslg_officer`; `checkins_select_self_or_hosts`
   * did not — and `insertCheckin` carries `RETURNING id`, which Postgres runs
   * through the SELECT policy. The write died as "new row violates row-level
   * security policy" and reached the officer as a 500. Every earlier test in
   * this file holds the scanner as an `org_officer` of the hosting org, which is
   * why a defect on the product's load-bearing path survived four walks of the
   * loop.
   *
   * The repair is deliberately *not* to admit the role school-wide: it is held
   * by learners, and school-wide attendance plus the roster every learner can
   * already read is the non-participant list (src/db/rls/checkins.sql). A
   * session may read the rows it wrote itself, and `find_existing_checkin`
   * answers the one question that needs more than that.
   *
   * These go through `insertCheckin` and `selectExistingCheckin` rather than
   * restating their SQL: the clause that broke is one those functions own, and a
   * test that wrote its own INSERT could keep passing while the shipped one
   * failed (D33).
   */
  let clubFairId: string;

  beforeAll(async () => {
    const [event] = await db.sql<{ id: string }[]>`
      INSERT INTO events (school_id, org_id, title, starts_at, ends_at, status, publish_at)
      VALUES (${schoolA.schoolId}, ${schoolA.orgId}, 'Fixture Club Fair',
              now() - interval '1 hour', now() + interval '2 hours', 'approved', now())
      RETURNING id
    `;
    clubFairId = event!.id;
  });

  /** A learner nobody else's assertions count. */
  async function freshLearner(label: string): Promise<string> {
    const [row] = await db.sql<{ id: string }[]>`
      INSERT INTO profiles (school_id, username, display_name, grade_level, section, status)
      VALUES (${schoolA.schoolId}, ${`chk-a-${label}`}, ${`Fixture ${label}`}, 9, 'Sampaguita', 'active')
      RETURNING id
    `;
    return row!.id;
  }

  async function scanAs(claims: TestClaims, attendee: string): Promise<string | null> {
    return asUserThroughDrizzle(db.url, claims, (tx) =>
      insertCheckin(tx, schoolA.schoolId, claims.profileId, {
        eventId: clubFairId,
        profileId: attendee,
        jti: randomUUID(),
        scannedAt: new Date().toISOString(),
        deviceId: "fixture-sslg-scanner",
        direction: "in",
        method: "officer_scan",
      }),
    );
  }

  it("writes the attendance row and gets its id back", async () => {
    const checkinId = await scanAs(sslgOfficer, await freshLearner("clubfair-1"));
    expect(checkinId).not.toBeNull();
  });

  it("turns that scan into a point", async () => {
    const attendee = await freshLearner("clubfair-2");
    const before = await ledgerTotal(attendee);

    const xp = await asUserThroughDrizzle(db.url, sslgOfficer, async (tx) => {
      const checkinId = await insertCheckin(tx, schoolA.schoolId, sslgOfficer.profileId, {
        eventId: clubFairId,
        profileId: attendee,
        jti: randomUUID(),
        scannedAt: new Date().toISOString(),
        direction: "in",
        method: "officer_scan",
      });
      if (!checkinId) throw new Error("the insert was absorbed; this scan is meant to be new");
      return callAwardCheckinXp(tx, checkinId);
    });

    expect(xp).toBe(ATTEND_XP);
    expect(await ledgerTotal(attendee)).toBe(before + ATTEND_XP);
  });

  /**
   * Every role `checkins_insert_hosts` admits can complete a write.
   *
   * The two policies are no longer symmetric and are not meant to be — the
   * repair was to stop trying to make the SELECT policy a superset of the INSERT
   * one. What has to hold instead is weaker, and is the thing that actually
   * broke: a role allowed to write attendance can finish the write. A role added
   * to the INSERT policy and to neither the SELECT policy nor `recorded_by`
   * fails here rather than at a gate.
   */
  it.each([
    ["school_admin", ["school_admin"]],
    ["sslg_officer", ["learner", "sslg_officer"]],
    ["sslg_adviser", ["sslg_adviser"]],
  ])("lets a school-wide %s finish the write it is allowed to make", async (label, roles) => {
    const claims: TestClaims = {
      schoolId: schoolA.schoolId,
      profileId: sslgOfficer.profileId,
      roles,
      orgGrants: [],
    };

    expect(await scanAs(claims, await freshLearner(`write-${label}`))).not.toBeNull();
  });
});

describe("what the gate may ask, and what it may not read (D-08)", () => {
  /**
   * The privacy half of D-08, and the reason the SELECT policy was not widened.
   *
   * `sslg_officer` is held by learners (seed/demo-people.json), and
   * `profiles_select_tenant` already gives every learner the whole roster. So
   * school-wide SELECT on `checkins` is the non-participant list by subtraction
   * — a surface docs/SYSTEM_DESIGN.md §2 denies to SSLG Officer, denies even to
   * Guidance, and docs/DATA_FLOW.md T8 requires to be audited on every access. A
   * raw SELECT satisfied by RLS is audited nowhere.
   *
   * `find_existing_checkin` is what the officer gets instead: one answer about
   * one learner they already named.
   */
  let eventId: string;
  let attendee: string;

  beforeAll(async () => {
    const [event] = await db.sql<{ id: string }[]>`
      INSERT INTO events (school_id, org_id, title, starts_at, ends_at, status, publish_at)
      VALUES (${schoolA.schoolId}, ${schoolA.orgId}, 'Fixture Two-Gate Assembly',
              now() - interval '1 hour', now() + interval '2 hours', 'approved', now())
      RETURNING id
    `;
    eventId = event!.id;

    const [row] = await db.sql<{ id: string }[]>`
      INSERT INTO profiles (school_id, username, display_name, grade_level, section, status)
      VALUES (${schoolA.schoolId}, 'chk-a-two-gate', 'Fixture Two Gate', 9, 'Sampaguita', 'active')
      RETURNING id
    `;
    attendee = row!.id;

    // Gate A: an org officer of the hosting org writes the row.
    await asUserThroughDrizzle(db.url, officer, (tx) =>
      insertCheckin(tx, schoolA.schoolId, officer.profileId, {
        eventId,
        profileId: attendee,
        jti: randomUUID(),
        scannedAt: new Date().toISOString(),
        direction: "in",
        method: "officer_scan",
      }),
    );
  });

  /** A second gate, staffed by the SSLG officer, scanning a different learner. */
  async function scanAtGateB(): Promise<string> {
    const [row] = await db.sql<{ id: string }[]>`
      INSERT INTO profiles (school_id, username, display_name, grade_level, section, status)
      VALUES (${schoolA.schoolId}, 'chk-a-gate-b', 'Fixture Gate B', 9, 'Sampaguita', 'active')
      RETURNING id
    `;
    const id = await asUserThroughDrizzle(db.url, sslgOfficer, (tx) =>
      insertCheckin(tx, schoolA.schoolId, sslgOfficer.profileId, {
        eventId,
        profileId: row!.id,
        jti: randomUUID(),
        scannedAt: new Date().toISOString(),
        direction: "in",
        method: "officer_scan",
      }),
    );
    if (!id) throw new Error("the fixture scan was absorbed");
    return id;
  }

  it("tells gate B the learner is already checked in", async () => {
    const existing = await asUserThroughDrizzle(db.url, sslgOfficer, (tx) =>
      selectExistingCheckin(tx, eventId, attendee, "in"),
    );

    // Without this the officer is told "accepted" beside an award of zero, which
    // is how an officer learns to distrust the scanner.
    expect(existing).not.toBeNull();
  });

  it("shows that officer none of the rows behind the answer", async () => {
    const rows = await asUser(db.sql, sslgOfficer, async (tx) =>
      tx<{ id: string }[]>`SELECT id FROM checkins WHERE event_id = ${eventId}`,
    );

    // The row exists, gate B was just told about it, and the policy still does
    // not hand it over: no scanned_at, no device_id, no recorded_by, and above
    // all no way to ask the same question of everybody at once.
    expect(rows).toHaveLength(0);
  });

  it("shows that officer the rows they wrote themselves, and only those", async () => {
    const mine = await scanAtGateB();

    const rows = await asUser(db.sql, sslgOfficer, async (tx) =>
      tx<{ id: string }[]>`SELECT id FROM checkins WHERE event_id = ${eventId}`,
    );

    expect(rows.map((row) => row.id)).toEqual([mine]);
  });

  /*
   * The two refusals below drive the function through `asUser` rather than
   * `asUserThroughDrizzle`: what is under test is the SQL, and Drizzle wraps a
   * Postgres error as "Failed query: …" with the real message on `cause`, which
   * would make the assertion about the driver instead of the rule.
   */
  it("refuses a learner who may not write attendance here", async () => {
    await expect(
      asUser(
        db.sql,
        { schoolId: schoolA.schoolId, profileId: learnerId, roles: ["learner"] },
        async (tx) =>
          tx`SELECT public.find_existing_checkin(${eventId}::uuid, ${attendee}::uuid, 'in')`,
      ),
    ).rejects.toThrow(/not an officer or adviser/);
  });

  it("refuses an officer of another school outright (R1)", async () => {
    await expect(
      asUser(
        db.sql,
        {
          schoolId: schoolB.schoolId,
          profileId: schoolB.adminProfileId,
          roles: ["learner", "sslg_officer"],
        },
        async (tx) =>
          tx`SELECT public.find_existing_checkin(${eventId}::uuid, ${attendee}::uuid, 'in')`,
      ),
      // Not "no such check-in": the event itself is invisible, which is the same
      // answer an event that does not exist gets (src/lib/errors.ts).
    ).rejects.toThrow(/no such event in this school/);
  });
});
