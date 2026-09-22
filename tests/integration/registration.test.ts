import postgres from "postgres";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { asUser, startTestDatabase } from "./helpers/db";
import type { TestClaims, TestDatabase } from "./helpers/db";
import { seedTenant } from "./helpers/fixtures";
import type { Tenant } from "./helpers/fixtures";

/**
 * The registration slice (D-01, FR-3.3, US-2).
 *
 * These tests drive `public.register_for_event` and
 * `public.cancel_event_registration` directly, because those two functions are
 * where the rules actually live — `features/registration/service.ts` only
 * translates their outcomes into error codes. Testing the service against a
 * mocked database would prove the translation and leave the capacity race, the
 * eligibility rules and the tenancy check untested.
 *
 * The test that matters most is "two learners, one seat". It is the one that
 * fails if anybody ever moves the count back into TypeScript.
 */

let db: TestDatabase;
let schoolA: Tenant;
let schoolB: Tenant;

/** A second pool, so two transactions can genuinely contend. `db.sql` is max:1. */
let concurrent: Sql;

/** Uncapped, approved, published, running now. */
let openEventId: string;
/** capacity 1, so the second learner meets the waitlist. */
let tinyEventId: string;
/** Senior High only, for the eligibility refusal. */
let seniorEventId: string;
/** Approved but never published — invisible, and therefore not registrable. */
let unpublishedEventId: string;
/** Approved, published, and over. */
let endedEventId: string;

/** Extra learners in school A, for the capacity and waitlist cases. */
const learners: string[] = [];

async function makeEvent(
  tenant: Tenant,
  fields: {
    title: string;
    status: string;
    published: boolean;
    startsIn: string;
    endsIn: string;
    capacity?: number | null;
    eligibility?: Record<string, (number | string)[]>;
  },
): Promise<string> {
  const [row] = await db.sql<{ id: string }[]>`
    INSERT INTO events (school_id, org_id, title, starts_at, ends_at, capacity,
                        eligibility_json, status, publish_at)
    VALUES (${tenant.schoolId}, ${tenant.orgId}, ${fields.title},
            now() + ${fields.startsIn}::interval, now() + ${fields.endsIn}::interval,
            ${fields.capacity ?? null},
            ${db.sql.json(fields.eligibility ?? {})}::jsonb,
            ${fields.status}::event_status,
            ${fields.published ? db.sql`now() - interval '7 days'` : null})
    RETURNING id
  `;
  return row!.id;
}

beforeAll(async () => {
  db = await startTestDatabase();
  concurrent = postgres(db.url, { max: 4, onnotice: () => {} });

  schoolA = await seedTenant(db.sql, "reg-a");
  schoolB = await seedTenant(db.sql, "reg-b");

  openEventId = await makeEvent(schoolA, {
    title: "Fixture Open Assembly",
    status: "approved",
    published: true,
    startsIn: "-1 hour",
    endsIn: "3 hours",
  });
  tinyEventId = await makeEvent(schoolA, {
    title: "Fixture One-Seat Workshop",
    status: "approved",
    published: true,
    startsIn: "2 days",
    endsIn: "2 days 3 hours",
    capacity: 1,
  });
  seniorEventId = await makeEvent(schoolA, {
    title: "Fixture Senior High Send-off",
    status: "approved",
    published: true,
    startsIn: "3 days",
    endsIn: "3 days 2 hours",
    eligibility: { gradeLevels: [11, 12] },
  });
  unpublishedEventId = await makeEvent(schoolA, {
    title: "Fixture Unpublished Rally",
    status: "approved",
    published: false,
    startsIn: "4 days",
    endsIn: "4 days 2 hours",
  });
  endedEventId = await makeEvent(schoolA, {
    title: "Fixture Finished Fair",
    status: "approved",
    published: true,
    startsIn: "-2 days",
    endsIn: "-1 day",
  });

  // The fixture ships one learner per school; capacity needs a queue.
  for (let i = 0; i < 4; i += 1) {
    const [row] = await db.sql<{ id: string }[]>`
      INSERT INTO profiles (school_id, username, display_name, grade_level, section, status)
      VALUES (${schoolA.schoolId}, ${`reg-a-learner-${String(i)}`},
              ${`Fixture Learner ${String(i)}`}, 9, 'Sampaguita', 'active')
      RETURNING id
    `;
    learners.push(row!.id);
    await db.sql`
      INSERT INTO user_roles (school_id, profile_id, role)
      VALUES (${schoolA.schoolId}, ${row!.id}, 'learner')
    `;
  }
}, 300_000);

afterAll(async () => {
  await concurrent?.end();
  await db?.sql?.end();
  await db?.stop();
});

interface Outcome {
  r_outcome: string;
  r_status: string | null;
  r_waitlist_position: number | null;
  r_registered_at: Date | null;
  r_detail: Record<string, unknown>;
}

function learnerClaims(tenant: Tenant, profileId: string): TestClaims {
  return { schoolId: tenant.schoolId, profileId, roles: ["learner"] };
}

async function register(
  claims: TestClaims,
  eventId: string,
  acceptWaitlist = false,
  pool: Sql = db.sql,
): Promise<Outcome> {
  const rows = await asUser(pool, claims, async (tx) => {
    return tx<Outcome[]>`
      SELECT * FROM public.register_for_event(${eventId}::uuid, ${acceptWaitlist}::boolean)
    `;
  });
  return rows[0]!;
}

async function cancel(claims: TestClaims, eventId: string): Promise<Outcome & {
  r_promoted_profile_id: string | null;
}> {
  const rows = await asUser(db.sql, claims, async (tx) => {
    return tx<(Outcome & { r_promoted_profile_id: string | null })[]>`
      SELECT * FROM public.cancel_event_registration(${eventId}::uuid)
    `;
  });
  return rows[0]!;
}

describe("registering for an event", () => {
  it("gives a learner a seat on an open, published event", async () => {
    const result = await register(learnerClaims(schoolA, schoolA.learnerProfileId), openEventId);
    expect(result.r_outcome).toBe("registered");
    expect(result.r_status).toBe("registered");
    expect(result.r_waitlist_position).toBeNull();
  });

  it("returns the same seat when the same learner registers again (a retry is not a mistake)", async () => {
    const claims = learnerClaims(schoolA, schoolA.learnerProfileId);
    const first = await register(claims, openEventId);
    const second = await register(claims, openEventId);

    expect(second.r_outcome).toBe("registered");
    expect(second.r_registered_at?.getTime()).toBe(first.r_registered_at?.getTime());

    const [row] = await db.sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM event_registrations
      WHERE event_id = ${openEventId} AND profile_id = ${schoolA.learnerProfileId}
    `;
    expect(row!.count).toBe(1);
  });

  it("refuses an event in another school the same way it refuses one that does not exist", async () => {
    const result = await register(
      learnerClaims(schoolB, schoolB.learnerProfileId),
      openEventId,
    );
    expect(result.r_outcome).toBe("not_found");

    // And nothing was written into school A by a school B session.
    const [row] = await db.sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM event_registrations
      WHERE event_id = ${openEventId} AND profile_id = ${schoolB.learnerProfileId}
    `;
    expect(row!.count).toBe(0);
  });

  it("refuses an unpublished event as not_found, not as a refusal that confirms it exists", async () => {
    const result = await register(
      learnerClaims(schoolA, schoolA.learnerProfileId),
      unpublishedEventId,
    );
    expect(result.r_outcome).toBe("not_found");
  });

  it("refuses an event that has already ended, and says which criterion closed it", async () => {
    const result = await register(learnerClaims(schoolA, schoolA.learnerProfileId), endedEventId);
    expect(result.r_outcome).toBe("not_eligible");
    expect(result.r_detail.criterion).toBe("registration_closed");
  });

  it("refuses loudly when an event's eligibility rule is malformed, rather than admitting everyone", async () => {
    // A double-encoded rule: jsonb accepts it, and every typeof guard in
    // register_for_event then reads the rule as absent. Failing open here would
    // silently open a Senior-High-only event to Grade 7.
    const [broken] = await db.sql<{ id: string }[]>`
      INSERT INTO events (school_id, org_id, title, starts_at, ends_at, eligibility_json, status, publish_at)
      VALUES (${schoolA.schoolId}, ${schoolA.orgId}, 'Fixture Malformed Rule',
              now() + interval '7 days', now() + interval '7 days 2 hours',
              ${JSON.stringify(JSON.stringify({ gradeLevels: [11, 12] }))}::jsonb,
              'approved', now())
      RETURNING id
    `;

    await expect(
      register(learnerClaims(schoolA, schoolA.learnerProfileId), broken!.id),
    ).rejects.toThrow(/eligibility_malformed/);
  });

  it("names the criterion that excluded a learner, and echoes the event's own rule (US-2)", async () => {
    const result = await register(learnerClaims(schoolA, schoolA.learnerProfileId), seniorEventId);
    expect(result.r_outcome).toBe("not_eligible");
    expect(result.r_detail.criterion).toBe("grade_level");
    expect(result.r_detail.allowedGradeLevels).toEqual([11, 12]);
  });
});

describe("capacity and the waitlist", () => {
  it("refuses a full event with the waitlist offer rather than silently waitlisting (US-2)", async () => {
    // capacity 1: the first learner takes it.
    const first = await register(learnerClaims(schoolA, learners[0]!), tinyEventId);
    expect(first.r_outcome).toBe("registered");

    const second = await register(learnerClaims(schoolA, learners[1]!), tinyEventId);
    expect(second.r_outcome).toBe("event_full");
    expect(second.r_detail).toMatchObject({ capacity: 1, waitlistAvailable: true });

    // The refusal wrote nothing. A learner who declines the waitlist holds no row.
    const [row] = await db.sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM event_registrations
      WHERE event_id = ${tinyEventId} AND profile_id = ${learners[1]!}
    `;
    expect(row!.count).toBe(0);
  });

  it("puts a learner who accepts the offer on the waitlist, in order", async () => {
    const second = await register(learnerClaims(schoolA, learners[1]!), tinyEventId, true);
    expect(second.r_outcome).toBe("waitlisted");
    expect(second.r_waitlist_position).toBe(1);

    const third = await register(learnerClaims(schoolA, learners[2]!), tinyEventId, true);
    expect(third.r_waitlist_position).toBe(2);
  });

  it("promotes the head of the waitlist when a seat is given up, and renumbers the rest", async () => {
    const result = await cancel(learnerClaims(schoolA, learners[0]!), tinyEventId);
    expect(result.r_outcome).toBe("cancelled");
    expect(result.r_promoted_profile_id).toBe(learners[1]!);

    const rows = await db.sql<{ profile_id: string; status: string; waitlist_position: number | null }[]>`
      SELECT profile_id, status, waitlist_position FROM event_registrations
      WHERE event_id = ${tinyEventId} ORDER BY status, waitlist_position
    `;
    const promoted = rows.find((r) => r.profile_id === learners[1]!);
    const stillWaiting = rows.find((r) => r.profile_id === learners[2]!);

    expect(promoted).toMatchObject({ status: "registered", waitlist_position: null });
    // Renumbered from 2 to 1: a gap would read to a learner as the queue not moving.
    expect(stillWaiting).toMatchObject({ status: "waitlisted", waitlist_position: 1 });
  });

  it("lets a cancelled learner register again, reusing their row", async () => {
    // There is no DELETE grant on event_registrations, so re-registering has to
    // update the cancelled row — the unique (event_id, profile_id) index means
    // there is only ever one.
    const again = await register(learnerClaims(schoolA, learners[0]!), tinyEventId, true);
    expect(again.r_outcome).toBe("waitlisted");

    const [row] = await db.sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM event_registrations
      WHERE event_id = ${tinyEventId} AND profile_id = ${learners[0]!}
    `;
    expect(row!.count).toBe(1);
  });

  it("refuses to cancel a registration that is not there", async () => {
    const result = await cancel(learnerClaims(schoolA, learners[3]!), tinyEventId);
    expect(result.r_outcome).toBe("not_found");
  });
});

describe("two learners, one seat", () => {
  /**
   * The reason capacity is settled in SQL (docs/WORKSTREAMS.md, D-01).
   *
   * Both transactions start before either commits. With the count in a service
   * they both read the same free seat and both insert; with the count inside
   * the function, behind `SELECT ... FOR UPDATE` on the event row, the second
   * waits for the first and then sees a full event.
   */
  it("gives the seat to exactly one of two simultaneous registrations", async () => {
    const raceEventId = await makeEvent(schoolA, {
      title: "Fixture Last Seat",
      status: "approved",
      published: true,
      startsIn: "5 days",
      endsIn: "5 days 2 hours",
      capacity: 1,
    });

    const [one, two] = await Promise.all([
      register(learnerClaims(schoolA, learners[0]!), raceEventId, false, concurrent),
      register(learnerClaims(schoolA, learners[1]!), raceEventId, false, concurrent),
    ]);

    const outcomes = [one.r_outcome, two.r_outcome].sort();
    expect(outcomes).toEqual(["event_full", "registered"]);

    const [row] = await db.sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM event_registrations
      WHERE event_id = ${raceEventId} AND status = 'registered'
    `;
    expect(row!.count).toBe(1);
  });

  it("holds the cap when ten learners rush four seats", async () => {
    const rushEventId = await makeEvent(schoolA, {
      title: "Fixture Rush",
      status: "approved",
      published: true,
      startsIn: "6 days",
      endsIn: "6 days 2 hours",
      capacity: 4,
    });

    // Ten distinct learners, all accepting the waitlist, all at once.
    const rushers: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      const [row] = await db.sql<{ id: string }[]>`
        INSERT INTO profiles (school_id, username, display_name, grade_level, section, status)
        VALUES (${schoolA.schoolId}, ${`reg-a-rusher-${String(i)}`},
                ${`Fixture Rusher ${String(i)}`}, 10, 'Ilang-Ilang', 'active')
        RETURNING id
      `;
      rushers.push(row!.id);
    }

    await Promise.all(
      rushers.map((profileId) =>
        register(learnerClaims(schoolA, profileId), rushEventId, true, concurrent),
      ),
    );

    const [seats] = await db.sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM event_registrations
      WHERE event_id = ${rushEventId} AND status = 'registered'
    `;
    expect(seats!.count).toBe(4);

    // And the waitlist is a queue, not a pile: positions 1..6, each used once.
    const waiting = await db.sql<{ waitlist_position: number }[]>`
      SELECT waitlist_position FROM event_registrations
      WHERE event_id = ${rushEventId} AND status = 'waitlisted'
      ORDER BY waitlist_position
    `;
    expect(waiting.map((r) => r.waitlist_position)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("the roster", () => {
  it("shows the hosting org's officer the whole roster", async () => {
    const rows = await asUser(
      db.sql,
      {
        schoolId: schoolA.schoolId,
        profileId: schoolA.learnerProfileId,
        roles: ["learner", "org_officer"],
        orgGrants: [{ orgId: schoolA.orgId, role: "org_officer" }],
      },
      async (tx) =>
        tx<{ profile_id: string }[]>`
          SELECT profile_id FROM event_registrations WHERE event_id = ${openEventId}
        `,
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it("shows a learner only their own row, so no fill count can be derived", async () => {
    // Two learners registered for openEventId by now; a learner must see one row.
    await register(learnerClaims(schoolA, learners[3]!), openEventId);

    const rows = await asUser(
      db.sql,
      learnerClaims(schoolA, learners[3]!),
      async (tx) =>
        tx<{ profile_id: string }[]>`
          SELECT profile_id FROM event_registrations WHERE event_id = ${openEventId}
        `,
    );
    expect(rows.map((r) => r.profile_id)).toEqual([learners[3]!]);
  });

  it("shows an officer of another school nothing at all", async () => {
    const rows = await asUser(
      db.sql,
      {
        schoolId: schoolB.schoolId,
        profileId: schoolB.learnerProfileId,
        roles: ["learner", "org_officer"],
        orgGrants: [{ orgId: schoolB.orgId, role: "org_officer" }],
      },
      async (tx) =>
        tx<{ profile_id: string }[]>`
          SELECT profile_id FROM event_registrations WHERE event_id = ${openEventId}
        `,
    );
    expect(rows).toHaveLength(0);
  });
});
