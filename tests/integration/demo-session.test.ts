import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "postgres";

import { asUser, startTestDatabase } from "./helpers/db";
import type { TestDatabase } from "./helpers/db";
import { seedTenant } from "./helpers/fixtures";
import type { Tenant } from "./helpers/fixtures";

/**
 * The demo session source (D23), tested where its gate actually lives.
 *
 * The claim this file has to defend is narrow and load-bearing: the persona
 * switcher is not a way into a real tenant. `is_demo` is a row in `schools`, the
 * filter is in SQL, and so the test is a real school sitting in the same database
 * as a synthetic one — because that is the shape of the mistake. A gate written
 * in TypeScript would be tested by mocking the thing under test.
 *
 * `real-school` here is a school with `is_demo = false`. Nothing in it resembles
 * a learner and nothing real enters any environment before Gate B — it is the
 * tenant that must stay invisible, and it needs a name for that reason only.
 */

let db: TestDatabase;
let demoTenant: Tenant;
let otherDemoTenant: Tenant;
let realSchoolId: string;
let realProfileId: string;
let inactiveProfileId: string;

/** Mirrors withoutClaims() in src/lib/db/client.ts: the pre-session privilege level. */
async function asRole<T>(role: string, fn: (tx: Sql) => Promise<T>): Promise<T> {
  return db.sql.begin(async (tx) => {
    await tx.unsafe(`set local role ${role}`);
    return fn(tx as unknown as Sql);
  }) as Promise<T>;
}

interface ClaimsRow {
  school_id: string;
  profile_id: string;
  roles: string[];
  org_grants: { org_id: string; role: string }[];
  display_name: string;
  school_name: string;
}

async function claimsFor(profileId: string): Promise<ClaimsRow[]> {
  return asRole(
    "authenticated",
    async (tx) => tx<ClaimsRow[]>`SELECT * FROM public.demo_session_claims(${profileId}::uuid)`,
  );
}

beforeAll(async () => {
  db = await startTestDatabase();
  demoTenant = await seedTenant(db.sql, "demo-one");
  otherDemoTenant = await seedTenant(db.sql, "demo-two");

  // An org-scoped grant, so the claims shape is tested with something in it.
  await db.sql`
    INSERT INTO user_roles (school_id, profile_id, role, org_id)
    VALUES (${demoTenant.schoolId}, ${demoTenant.learnerProfileId}, 'org_officer', ${demoTenant.orgId})
  `;

  // Not a demo tenant. This is the row the gate exists for.
  const [school] = await db.sql<{ id: string }[]>`
    INSERT INTO schools (slug, name, abbreviation, is_demo)
    VALUES ('real-school', 'Not A Demo School', 'NADS', false)
    RETURNING id
  `;
  realSchoolId = school!.id;

  const [profile] = await db.sql<{ id: string }[]>`
    INSERT INTO profiles (school_id, username, display_name, grade_level, section, status)
    VALUES (${realSchoolId}, 'real-learner', 'Fixture Outsider', 8, 'Rosal', 'active')
    RETURNING id
  `;
  realProfileId = profile!.id;

  await db.sql`
    INSERT INTO user_roles (school_id, profile_id, role)
    VALUES (${realSchoolId}, ${realProfileId}, 'learner')
  `;

  // A demo profile that has not activated: seeded without consent, so it stays
  // at `imported` and the activation gate can be shown refusing it.
  const [inactive] = await db.sql<{ id: string }[]>`
    INSERT INTO profiles (school_id, username, display_name, status)
    VALUES (${demoTenant.schoolId}, 'demo-imported', 'Fixture Unconsented', 'imported')
    RETURNING id
  `;
  inactiveProfileId = inactive!.id;
}, 300_000);

afterAll(async () => {
  await db?.sql?.end();
  await db?.stop();
});

describe("demo_session_claims — the gate", () => {
  it("issues claims for an active profile in a demo school", async () => {
    const rows = await claimsFor(demoTenant.learnerProfileId);

    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.school_id).toBe(demoTenant.schoolId);
    expect(row.profile_id).toBe(demoTenant.learnerProfileId);
    expect(row.roles).toEqual(["learner", "org_officer"]);
    expect(row.org_grants).toEqual([{ org_id: demoTenant.orgId, role: "org_officer" }]);
    expect(row.display_name).toBe("Fixture Learner");
  });

  it("returns nothing for a profile in a school that is not flagged is_demo", async () => {
    // The whole point of D23. A switcher that can reach this row is a login bypass.
    expect(await claimsFor(realProfileId)).toHaveLength(0);
  });

  it("returns nothing for a profile that has not activated", async () => {
    expect(await claimsFor(inactiveProfileId)).toHaveLength(0);
  });

  it("returns nothing for an id that does not exist, indistinguishably", async () => {
    const rows = await claimsFor("00000000-0000-4000-8000-000000000000");
    // Same empty answer as the real tenant's profile above: telling the two
    // apart would confirm that a guessed id names someone.
    expect(rows).toHaveLength(0);
  });

  it("takes no school from its caller", async () => {
    // The tenant comes from the profile row, so there is no argument through
    // which a caller could ask to be somewhere else.
    const [signature] = await db.sql<{ args: string }[]>`
      SELECT pg_get_function_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'demo_session_claims'
    `;
    expect(signature!.args).toBe("target_profile uuid");
  });
});

describe("demo_personas — the catalogue", () => {
  it("lists active personas from every demo school and no others", async () => {
    const rows = await asRole(
      "authenticated",
      async (tx) => tx<{ profile_id: string; school_id: string }[]>`
        SELECT profile_id, school_id FROM public.demo_personas()
      `,
    );

    const ids = rows.map((r) => r.profile_id);
    expect(ids).toContain(demoTenant.learnerProfileId);
    expect(ids).toContain(otherDemoTenant.adminProfileId);

    // Neither the real tenant's learner nor the unactivated demo profile.
    expect(ids).not.toContain(realProfileId);
    expect(ids).not.toContain(inactiveProfileId);
    expect(rows.every((r) => r.school_id !== realSchoolId)).toBe(true);
  });

  it("puts staff before learners", async () => {
    const rows = await asRole(
      "authenticated",
      async (tx) => tx<{ profile_id: string; roles: string[] }[]>`
        SELECT profile_id, roles FROM public.demo_personas()
      `,
    );

    const hasExtraRole = rows.map((r) => r.roles.some((role) => role !== "learner"));
    const lastStaff = hasExtraRole.lastIndexOf(true);
    const firstPureLearner = hasExtraRole.indexOf(false);
    expect(lastStaff).toBeLessThan(firstPureLearner);
  });
});

describe("the claims it issues are ordinary claims", () => {
  it("reads its own school and nothing of another's", async () => {
    const [row] = await claimsFor(demoTenant.adminProfileId);
    const claims = {
      schoolId: row!.school_id,
      profileId: row!.profile_id,
      roles: row!.roles,
      orgGrants: row!.org_grants.map((g) => ({ orgId: g.org_id, role: g.role })),
    };

    // A demo session is a session: the policies in src/db/rls/ apply to it
    // exactly as they will to a pilot login, which is what makes the demo
    // evidence rather than theatre.
    const own = await asUser(db.sql, claims, async (tx) => {
      return tx<{ count: number }[]>`SELECT count(*)::int AS count FROM profiles`;
    });
    expect(own[0]!.count).toBeGreaterThan(0);

    const foreign = await asUser(db.sql, claims, async (tx) => {
      return tx<{ count: number }[]>`
        SELECT count(*)::int AS count FROM profiles WHERE school_id = ${otherDemoTenant.schoolId}
      `;
    });
    expect(foreign[0]!.count).toBe(0);
  });
});

describe("who may call them", () => {
  it("grants EXECUTE to authenticated only", async () => {
    const [grants] = await db.sql<
      {
        anon: boolean;
        authenticated: boolean;
        service_role: boolean;
        anon_personas: boolean;
        authenticated_personas: boolean;
      }[]
    >`
      SELECT has_function_privilege('anon', 'public.demo_session_claims(uuid)', 'EXECUTE') AS anon,
             has_function_privilege('authenticated', 'public.demo_session_claims(uuid)', 'EXECUTE') AS authenticated,
             has_function_privilege('service_role', 'public.demo_session_claims(uuid)', 'EXECUTE') AS service_role,
             has_function_privilege('anon', 'public.demo_personas()', 'EXECUTE') AS anon_personas,
             has_function_privilege('authenticated', 'public.demo_personas()', 'EXECUTE') AS authenticated_personas
    `;

    // A SECURITY DEFINER function left at Supabase's default grants is an RLS
    // bypass anyone who reaches the database can call.
    expect(grants!.anon).toBe(false);
    expect(grants!.anon_personas).toBe(false);
    expect(grants!.service_role).toBe(false);
    expect(grants!.authenticated).toBe(true);
    expect(grants!.authenticated_personas).toBe(true);
  });

  it("pins search_path on both, so the owner's query cannot be redirected", async () => {
    const rows = await db.sql<{ proname: string; config: string[] | null }[]>`
      SELECT p.proname, p.proconfig AS config
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname IN ('demo_personas', 'demo_session_claims')
      ORDER BY p.proname
    `;

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.config).toContain('search_path=""');
    }
  });
});
