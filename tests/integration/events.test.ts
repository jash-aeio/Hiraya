import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { asUser, startTestDatabase } from "./helpers/db";
import type { TestDatabase } from "./helpers/db";
import { seedTenant } from "./helpers/fixtures";
import type { Tenant } from "./helpers/fixtures";

/**
 * The browse screen's read path (FR-3.2, FR-3.3).
 *
 * `src/features/events/queries.ts` deliberately writes no `status` filter: "an
 * event is invisible to learners until it is approved" is a policy in
 * `src/db/rls/events.sql`, and a query that re-stated it would look safe while
 * quietly becoming the thing the policy is trusted to be. That makes these
 * tests the only place the rule is proven, so they exercise the same SELECT
 * shape the query issues rather than the query's own filters.
 */

let db: TestDatabase;
let schoolA: Tenant;
let schoolB: Tenant;
let draftEventId: string;

beforeAll(async () => {
  db = await startTestDatabase();
  schoolA = await seedTenant(db.sql, "evt-a");
  schoolB = await seedTenant(db.sql, "evt-b");

  // The fixture's event is approved and published. Browse has to be tested
  // against the other case too, and the other case is the one that matters.
  const [draft] = await db.sql<{ id: string }[]>`
    INSERT INTO events (school_id, org_id, title, starts_at, ends_at, status, publish_at)
    VALUES (${schoolA.schoolId}, ${schoolA.orgId}, 'Fixture Unapproved Rally',
            now() + interval '3 days', now() + interval '3 days 2 hours', 'pending', NULL)
    RETURNING id
  `;
  draftEventId = draft!.id;
}, 300_000);

afterAll(async () => {
  await db?.sql?.end();
  await db?.stop();
});

/** The shape `selectEvents` issues, minus the ordering and the limit. */
function browse(tenant: Tenant, profileId: string, roles: string[], orgRoles: string[]) {
  return asUser(
    db.sql,
    {
      schoolId: tenant.schoolId,
      profileId,
      roles,
      orgGrants: orgRoles.map((role) => ({ orgId: tenant.orgId, role })),
    },
    async (tx) => {
      return tx<{ id: string; school_id: string; status: string }[]>`
        SELECT e.id, e.school_id, e.status
        FROM events e
        JOIN organizations o ON o.id = e.org_id
        LEFT JOIN event_registrations r
          ON r.event_id = e.id AND r.profile_id = ${profileId}
      `;
    },
  );
}

function asLearner(tenant: Tenant) {
  return browse(tenant, tenant.learnerProfileId, ["learner"], []);
}

describe("browsing events", () => {
  it("shows a learner an approved, published event", async () => {
    const rows = await asLearner(schoolA);
    expect(rows.map((r) => r.id)).toContain(schoolA.eventId);
  });

  it("hides an unapproved event from a learner (FR-3.2)", async () => {
    const rows = await asLearner(schoolA);
    expect(rows.map((r) => r.id)).not.toContain(draftEventId);
    expect(rows.every((r) => r.status === "approved")).toBe(true);
  });

  it("shows that same unapproved event to an officer of the hosting org", async () => {
    // Proves the previous test measures the policy and not an empty table: the
    // row is there, and it is the caller's authority that decides.
    const rows = await browse(
      schoolA,
      schoolA.learnerProfileId,
      ["learner", "org_officer"],
      ["org_officer"],
    );
    expect(rows.map((r) => r.id)).toContain(draftEventId);
  });

  it("shows no event of school B to a learner of school A", async () => {
    const rows = await asLearner(schoolA);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.school_id === schoolA.schoolId)).toBe(true);
    expect(rows.map((r) => r.id)).not.toContain(schoolB.eventId);
  });

  it("does not let the registrations join widen what a learner can see", async () => {
    // The LEFT JOIN is scoped to the caller's own profile, but the policy is
    // what enforces it. If that policy ever loosened, the join would turn the
    // browse list into a roster — one row per registrant, names included.
    const [other] = await db.sql<{ id: string }[]>`
      INSERT INTO profiles (school_id, username, display_name, status)
      VALUES (${schoolA.schoolId}, 'evt-a-other', 'Fixture Other', 'active')
      RETURNING id
    `;
    await db.sql`
      INSERT INTO event_registrations (school_id, event_id, profile_id, status)
      VALUES (${schoolA.schoolId}, ${schoolA.eventId}, ${other!.id}, 'registered')
    `;

    const rows = await asLearner(schoolA);
    const forEvent = rows.filter((r) => r.id === schoolA.eventId);
    expect(forEvent).toHaveLength(1);
  });
});
