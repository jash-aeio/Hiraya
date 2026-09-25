import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedDemo } from "../../scripts/seed-demo";
import { asUser, startTestDatabase } from "./helpers/db";
import type { TestDatabase } from "./helpers/db";

/**
 * The demo seed, run against a real schema with the real policies in force.
 *
 * Two things are under test and neither is cosmetic.
 *
 * Re-running must change nothing. `xp_ledger` holds no DELETE grant for any role
 * and a trigger rejects the attempt even from the table owner (CLAUDE.md R4), so
 * the seed can never be a teardown-and-rebuild — every row is keyed and every
 * re-run is a replay. That is the same property the offline scan queue owes the
 * sync endpoint (R6), and this file is the first place in the repository where it
 * is actually exercised end to end.
 *
 * It must also write through RLS rather than around it. `seedDemo` inserts as
 * `authenticated` with School Admin claims, so a policy that would refuse the
 * real roster import refuses the seed too, and a green run here means the
 * schema can serve the product rather than merely hold its shape.
 */

let db: TestDatabase;

interface Tally {
  schools: number;
  profiles: number;
  organizations: number;
  events: number;
  registrations: number;
  checkins: number;
  ledgerRows: number;
  totalXp: number;
}

async function tally(): Promise<Tally> {
  const [row] = await db.sql<Tally[]>`
    SELECT (SELECT count(*) FROM schools)::int             AS "schools",
           (SELECT count(*) FROM profiles)::int            AS "profiles",
           (SELECT count(*) FROM organizations)::int       AS "organizations",
           (SELECT count(*) FROM events)::int              AS "events",
           (SELECT count(*) FROM event_registrations)::int AS "registrations",
           (SELECT count(*) FROM checkins)::int            AS "checkins",
           (SELECT count(*) FROM xp_ledger)::int           AS "ledgerRows",
           (SELECT coalesce(sum(delta), 0) FROM xp_ledger)::int AS "totalXp"
  `;
  if (!row) throw new Error("tally returned no row");
  return row;
}

let first: Tally;
let second: Tally;

beforeAll(async () => {
  db = await startTestDatabase();
  await seedDemo(db.url);
  first = await tally();
  await seedDemo(db.url);
  second = await tally();
}, 300_000);

afterAll(async () => {
  await db?.sql?.end();
  await db?.stop();
});

describe("the demo seed", () => {
  it("writes a tenant on the first run", () => {
    expect(first.schools).toBe(1);
    expect(first.profiles).toBeGreaterThan(40);
    expect(first.organizations).toBe(6);
    expect(first.events).toBe(12);
    expect(first.checkins).toBeGreaterThan(0);
    expect(first.totalXp).toBeGreaterThan(0);
  });

  it("changes nothing on the second run", () => {
    expect(second).toEqual(first);
  });

  it("awards no duplicate XP when replayed", () => {
    // The narrow version of the R6 guarantee: the same scans arriving twice add
    // no points. The scan queue will make the same promise against the same
    // constraint, checkins_event_profile_jti_key.
    expect(second.ledgerRows).toBe(first.ledgerRows);
    expect(second.totalXp).toBe(first.totalXp);
  });

  it("flags the tenant as demo, which is what drives the DEMO DATA marker", async () => {
    const [school] = await db.sql<{ is_demo: boolean }[]>`SELECT is_demo FROM schools`;
    expect(school?.is_demo).toBe(true);
  });

  it("stores no LRN for a synthetic learner", async () => {
    // profile_identifiers exists to de-duplicate a real roster import. Synthetic
    // learners have no LRN, and seeding fake hashes would put a privacy-sensitive
    // shape in the demo in exchange for nothing (CLAUDE.md §6).
    const [row] = await db.sql<{ n: number }[]>`SELECT count(*)::int AS n FROM profile_identifiers`;
    expect(row?.n).toBe(0);
  });

  it("leaves the unconsented learners un-activated", async () => {
    const [row] = await db.sql<{ n: number }[]>`
      SELECT count(*)::int AS n
      FROM profiles p
      WHERE p.grade_level IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM consent_records c WHERE c.profile_id = p.id)
        AND p.status <> 'imported'
    `;
    expect(row?.n).toBe(0);
  });

  it("cites a real check-in behind every attendance award", async () => {
    const [row] = await db.sql<{ n: number }[]>`
      SELECT count(*)::int AS n
      FROM xp_ledger l
      WHERE l.source_type = 'checkin'
        AND NOT EXISTS (SELECT 1 FROM checkins c WHERE c.id = l.source_id)
    `;
    expect(row?.n).toBe(0);
  });

  it("corrects a duplicate award with a reversal rather than an edit", async () => {
    const [reversal] = await db.sql<{ delta: number; reversal_of: string; reason: string }[]>`
      SELECT delta, reversal_of, reason FROM xp_ledger WHERE source_type = 'reversal'
    `;
    expect(reversal?.delta).toBeLessThan(0);
    expect(reversal?.reason).toBeTruthy();

    const [original] = await db.sql<{ delta: number }[]>`
      SELECT delta FROM xp_ledger WHERE id = ${reversal?.reversal_of ?? null}
    `;
    expect(original?.delta).toBe(-(reversal?.delta ?? 0));
  });

  it("keeps an unapproved event unpublished and unregistered", async () => {
    const [row] = await db.sql<{ n: number }[]>`
      SELECT count(*)::int AS n
      FROM events e
      WHERE e.status NOT IN ('approved', 'completed', 'cancelled')
        AND (e.publish_at IS NOT NULL
             OR EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.id))
    `;
    expect(row?.n).toBe(0);
  });

  it("always leaves one event in progress for the scanner to point at", async () => {
    const [row] = await db.sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM events WHERE now() BETWEEN starts_at AND ends_at
    `;
    expect(row?.n).toBe(1);
  });

  it("marks that event, and only it, as the one the demo keeps live (D-07)", async () => {
    // The test above only holds at seed time, which was the whole defect: five
    // hours later the scanner had nothing to point at. The flag is what lets the
    // database put the window back.
    const [row] = await db.sql<{ n: number; live: number }[]>`
      SELECT count(*)::int AS n,
             count(*) FILTER (WHERE now() BETWEEN starts_at AND ends_at)::int AS live
      FROM events WHERE demo_rolls_live
    `;
    expect(row?.n).toBe(1);
    expect(row?.live).toBe(1);
  });

  it("recovers a tenant whose live event went stale overnight (D-07)", async () => {
    // The state a demo seeded yesterday is actually in, reproduced rather than
    // described: push the window into the past and ask whether the demo is
    // walkable again afterwards.
    const [school] = await db.sql<{ id: string }[]>`SELECT id FROM schools WHERE is_demo LIMIT 1`;

    await db.sql`
      UPDATE events
         SET starts_at = now() - interval '30 hours', ends_at = now() - interval '25 hours'
       WHERE demo_rolls_live
    `;

    const [stale] = await db.sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM events WHERE now() BETWEEN starts_at AND ends_at
    `;
    expect(stale?.n).toBe(0);

    await db.sql.begin(async (tx) => {
      await tx.unsafe("set local role authenticated");
      await tx`SELECT public.demo_roll_live_events(${school!.id}::uuid)`;
    });

    const [after] = await db.sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM events WHERE now() BETWEEN starts_at AND ends_at
    `;
    expect(after?.n).toBe(1);
  });

  it("leaves one event full, with a contiguous waitlist behind it (D-05)", async () => {
    // The demo has to be able to tap Register and be refused with the offer
    // (US-2). That needs a capped event whose seats are actually gone.
    const [full] = await db.sql<{ id: string; capacity: number; seats: number }[]>`
      SELECT e.id, e.capacity,
             (SELECT count(*)::int FROM event_registrations r
               WHERE r.event_id = e.id AND r.status = 'registered') AS seats
      FROM events e
      WHERE e.capacity IS NOT NULL
        AND e.status = 'approved'
        AND (SELECT count(*) FROM event_registrations r
              WHERE r.event_id = e.id AND r.status = 'registered') >= e.capacity
      LIMIT 1
    `;

    expect(full).toBeDefined();
    expect(full!.seats).toBe(full!.capacity);

    const waiting = await db.sql<{ waitlist_position: number }[]>`
      SELECT waitlist_position FROM event_registrations
      WHERE event_id = ${full!.id} AND status = 'waitlisted'
      ORDER BY waitlist_position
    `;
    // 1-based and contiguous, which is the shape cancel_event_registration
    // maintains — the seed must not hold a state the real path cannot produce.
    expect(waiting.length).toBeGreaterThan(0);
    expect(waiting.map((r) => r.waitlist_position)).toEqual(
      waiting.map((_, index) => index + 1),
    );
  });

  it("produces a demo tenant the real register path agrees with", async () => {
    /*
     * The seed and `public.register_for_event` have to describe the same world.
     * A seeded event that looks full but registers a learner anyway would be
     * discovered in front of a teacher, which is the one place it must not be.
     */
    const [full] = await db.sql<{ id: string }[]>`
      SELECT e.id FROM events e
      WHERE e.capacity IS NOT NULL
        AND e.status = 'approved'
        AND (SELECT count(*) FROM event_registrations r
              WHERE r.event_id = e.id AND r.status = 'registered') >= e.capacity
      LIMIT 1
    `;

    // A learner of the demo school who holds no place on that event.
    const [learner] = await db.sql<{ id: string; school_id: string }[]>`
      SELECT p.id, p.school_id FROM profiles p
      WHERE p.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM event_registrations r
          WHERE r.event_id = ${full!.id} AND r.profile_id = p.id
        )
      LIMIT 1
    `;

    const outcome = await asUser(
      db.sql,
      { schoolId: learner!.school_id, profileId: learner!.id, roles: ["learner"] },
      async (tx) =>
        tx<{ r_outcome: string; r_detail: Record<string, unknown> }[]>`
          SELECT r_outcome, r_detail FROM public.register_for_event(${full!.id}::uuid, false)
        `,
    );

    expect(outcome[0]!.r_outcome).toBe("event_full");
    expect(outcome[0]!.r_detail).toMatchObject({ waitlistAvailable: true });
  });

  it("stores every eligibility rule as an object, not as a string of one", async () => {
    /*
     * A regression guard on a bug that hid in plain sight: the seed passed
     * `JSON.stringify(...)` to a jsonb column, postgres.js stringified it again
     * as part of serializing the parameter, and the row ended up holding a jsonb
     * *string*. Every `->` read it as absent, so the Senior-High-only event
     * silently admitted the whole school — and nothing failed, which is what
     * made it worth a test rather than a fix.
     */
    const rows = await db.sql<{ kind: string; n: number }[]>`
      SELECT jsonb_typeof(eligibility_json) AS kind, count(*)::int AS n
      FROM events GROUP BY 1
    `;
    expect(rows.map((r) => r.kind)).toEqual(["object"]);

    const [restricted] = await db.sql<{ grades: number[] }[]>`
      SELECT ARRAY(SELECT jsonb_array_elements_text(eligibility_json -> 'gradeLevels')::int) AS grades
      FROM events
      WHERE jsonb_array_length(COALESCE(eligibility_json -> 'gradeLevels', '[]'::jsonb)) > 0
      LIMIT 1
    `;
    // The demo needs at least one event that refuses somebody, or the
    // NOT_ELIGIBLE screen has nothing to show.
    expect(restricted?.grades.length).toBeGreaterThan(0);
  });

  it("refuses to run beside a school that is not flagged demo", async () => {
    await db.sql`
      INSERT INTO schools (slug, name, is_demo) VALUES ('not-a-demo', 'Not A Demo', false)
    `;
    try {
      await expect(seedDemo(db.url)).rejects.toThrow(/not flagged is_demo/);
    } finally {
      await db.sql`DELETE FROM schools WHERE slug = 'not-a-demo'`;
    }
  });
});
