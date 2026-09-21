import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { verifyRls } from "../../scripts/verify-rls";
import { asUser, reapplyRls, startTestDatabase } from "./helpers/db";
import type { TestDatabase } from "./helpers/db";
import { seedTenant } from "./helpers/fixtures";
import type { Tenant } from "./helpers/fixtures";

/**
 * `xp_balances` is the one object in the schema that is not a table, and that
 * is exactly why it needs its own test: a view runs as its OWNER unless it is
 * declared `security_invoker = true`, so the same SELECT that RLS refuses on
 * `xp_ledger` would succeed through a view built carelessly over it. D19 chose
 * a view for that reason, and banned the materialized alternative for it too.
 *
 * So these tests assert the tenancy rule twice — once against the option, once
 * against an actual cross-tenant read — and then assert that the arithmetic the
 * XP screen depends on survives a reversal row.
 */

let db: TestDatabase;
let schoolA: Tenant;
let schoolB: Tenant;

beforeAll(async () => {
  db = await startTestDatabase();
  schoolA = await seedTenant(db.sql, "xpb-a");
  schoolB = await seedTenant(db.sql, "xpb-b");
}, 300_000);

afterAll(async () => {
  await db?.sql?.end();
  await db?.stop();
});

function learnerOf(tenant: Tenant) {
  return {
    schoolId: tenant.schoolId,
    profileId: tenant.learnerProfileId,
    roles: ["learner"],
    orgGrants: [],
  };
}

function adminOf(tenant: Tenant) {
  return {
    schoolId: tenant.schoolId,
    profileId: tenant.adminProfileId,
    roles: ["school_admin"],
    orgGrants: [],
  };
}

describe("xp_balances is not an RLS bypass", () => {
  it("is a plain view declared security_invoker, never materialized", async () => {
    const [view] = await db.sql<{ kind: string; opts: string | null }[]>`
      SELECT c.relkind::text AS kind, array_to_string(c.reloptions, ',') AS opts
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'xp_balances'
    `;
    expect(view?.kind).toBe("v");
    expect(view?.opts ?? "").toMatch(/security_invoker=(true|on)/i);
  });

  it("holds no grant for anon", async () => {
    const [grant] = await db.sql<{ any_priv: boolean }[]>`
      SELECT has_table_privilege('anon', 'public.xp_balances', 'SELECT') AS any_priv
    `;
    expect(grant?.any_priv).toBe(false);
  });

  it("is a rule db:verify-rls enforces, not just one this view happens to follow", async () => {
    // The check is worth only as much as its ability to fail. A view without
    // the option reads as its owner, past every policy beneath it — and checks
    // 1-6 never look at it, because they enumerate tables.
    await db.sql`CREATE VIEW public.xpb_owner_readable AS SELECT * FROM public.xp_ledger`;
    try {
      const findings = await verifyRls(db.url);
      expect(
        findings.some(
          (f) => f.detail.includes("xpb_owner_readable") && f.detail.includes("security_invoker"),
        ),
      ).toBe(true);
    } finally {
      await db.sql`DROP VIEW IF EXISTS public.xpb_owner_readable`;
    }

    expect(await verifyRls(db.url)).toEqual([]);
  });

  it("leaks across schools the moment the option is taken off it", async () => {
    // The test above proves the script has teeth. This one proves they are
    // pointed at something real: strip the option from the production view and
    // a learner of school A reads school B's ledger through it. Nothing else in
    // the suite would notice, which is the whole argument for check 8.
    await db.sql`ALTER VIEW public.xp_balances RESET (security_invoker)`;
    try {
      const leaked = await asUser(db.sql, learnerOf(schoolA), async (tx) => {
        return tx<{ school_id: string }[]>`
          SELECT school_id FROM xp_balances WHERE school_id = ${schoolB.schoolId}`;
      });
      expect(leaked.length).toBeGreaterThan(0);
    } finally {
      await reapplyRls(db.url);
    }

    const sealed = await asUser(db.sql, learnerOf(schoolA), async (tx) => {
      return tx`SELECT school_id FROM xp_balances WHERE school_id = ${schoolB.schoolId}`;
    });
    expect(sealed).toHaveLength(0);
    expect(await verifyRls(db.url)).toEqual([]);
  });

  it("returns no row of school B to a user of school A", async () => {
    const rows = await asUser(db.sql, learnerOf(schoolA), async (tx) => {
      return tx<{ school_id: string }[]>`SELECT school_id FROM xp_balances`;
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.school_id === schoolA.schoolId)).toBe(true);

    // Named directly, so the denial cannot be mistaken for an empty view.
    const direct = await asUser(db.sql, learnerOf(schoolA), async (tx) => {
      return tx`SELECT * FROM xp_balances WHERE profile_id = ${schoolB.learnerProfileId}`;
    });
    expect(direct).toHaveLength(0);
  });

  it("returns no row of school B to a school admin of school A either", async () => {
    // The learner case above is carried by `profile_id = current_profile_id()`,
    // which happens to imply the tenant. Staff read the whole school through the
    // OR-branch of the xp_ledger policy, where the tenant term is the only thing
    // standing between them and another school — so it is the branch a
    // mis-parenthesized edit would open, and the one worth naming in a test.
    const rows = await asUser(db.sql, adminOf(schoolA), async (tx) => {
      return tx<{ school_id: string }[]>`SELECT school_id FROM xp_balances`;
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.school_id === schoolA.schoolId)).toBe(true);

    const direct = await asUser(db.sql, adminOf(schoolA), async (tx) => {
      return tx`SELECT * FROM xp_balances WHERE profile_id = ${schoolB.learnerProfileId}`;
    });
    expect(direct).toHaveLength(0);
  });

  it("shows a learner only their own row, while staff see the school", async () => {
    const [other] = await db.sql<{ id: string }[]>`
      INSERT INTO profiles (school_id, username, display_name, status)
      VALUES (${schoolA.schoolId}, 'xpb-a-other', 'Fixture Other', 'active')
      RETURNING id
    `;
    await db.sql`
      INSERT INTO xp_ledger (school_id, profile_id, season_id, delta, participation_type, source_type)
      VALUES (${schoolA.schoolId}, ${other!.id}, ${schoolA.seasonId}, 25, 'attend_event', 'checkin')
    `;

    const asLearner = await asUser(db.sql, learnerOf(schoolA), async (tx) => {
      return tx<{ profile_id: string }[]>`SELECT profile_id FROM xp_balances`;
    });
    expect(asLearner.map((r) => r.profile_id)).toEqual([schoolA.learnerProfileId]);

    const asAdmin = await asUser(db.sql, adminOf(schoolA), async (tx) => {
      return tx<{ profile_id: string }[]>`SELECT profile_id FROM xp_balances`;
    });
    expect(asAdmin.map((r) => r.profile_id).sort()).toEqual(
      [schoolA.learnerProfileId, other!.id].sort(),
    );
  });
});

describe("xp_balances arithmetic", () => {
  it("sums the ledger and resolves the level from lifetime XP", async () => {
    const [row] = await asUser(db.sql, learnerOf(schoolA), async (tx) => {
      return tx<
        {
          lifetime_xp: number;
          season_xp: number;
          level_number: number | null;
          level_title: string | null;
          next_threshold_xp: number | null;
        }[]
      >`SELECT lifetime_xp, season_xp, level_number, level_title, next_threshold_xp
        FROM xp_balances WHERE profile_id = ${schoolA.learnerProfileId}`;
    });

    // The fixture awards 10 XP in the current season and declares one level at
    // threshold 0. Nothing sits above it, so there is no next threshold yet.
    expect(row?.lifetime_xp).toBe(10);
    expect(row?.season_xp).toBe(10);
    expect(row?.level_number).toBe(1);
    expect(row?.level_title).toBe("Kasapi");
    expect(row?.next_threshold_xp).toBeNull();
  });

  it("names the next threshold once one exists above the learner", async () => {
    await db.sql`
      INSERT INTO levels (school_id, level_number, threshold_xp, title, badge_key)
      VALUES (${schoolA.schoolId}, 2, 40, 'Lingkod', 'level-2')
    `;
    const [row] = await asUser(db.sql, learnerOf(schoolA), async (tx) => {
      return tx<{ level_number: number; next_threshold_xp: number | null }[]>`
        SELECT level_number, next_threshold_xp FROM xp_balances
        WHERE profile_id = ${schoolA.learnerProfileId}`;
    });
    expect(row?.level_number).toBe(1);
    expect(row?.next_threshold_xp).toBe(40);
  });

  it("subtracts a reversal row rather than needing the original edited (R4)", async () => {
    const [original] = await db.sql<{ id: string }[]>`
      INSERT INTO xp_ledger (school_id, profile_id, season_id, delta, participation_type, source_type)
      VALUES (${schoolB.schoolId}, ${schoolB.learnerProfileId}, ${schoolB.seasonId}, 30, 'attend_event', 'checkin')
      RETURNING id
    `;
    const before = await asUser(db.sql, learnerOf(schoolB), async (tx) => {
      return tx<{ lifetime_xp: number }[]>`
        SELECT lifetime_xp FROM xp_balances WHERE profile_id = ${schoolB.learnerProfileId}`;
    });
    expect(before[0]?.lifetime_xp).toBe(40);

    await db.sql`
      INSERT INTO xp_ledger (school_id, profile_id, season_id, delta, source_type, reversal_of, reason)
      VALUES (${schoolB.schoolId}, ${schoolB.learnerProfileId}, ${schoolB.seasonId}, -30, 'reversal', ${original!.id}, 'duplicate scan')
    `;
    const after = await asUser(db.sql, learnerOf(schoolB), async (tx) => {
      return tx<{ lifetime_xp: number }[]>`
        SELECT lifetime_xp FROM xp_balances WHERE profile_id = ${schoolB.learnerProfileId}`;
    });
    expect(after[0]?.lifetime_xp).toBe(10);

    // Both rows survive: the correction is a new fact, not a repaired one.
    const [count] = await db.sql<{ n: string }[]>`
      SELECT count(*) AS n FROM xp_ledger WHERE profile_id = ${schoolB.learnerProfileId}
    `;
    expect(Number(count!.n)).toBe(3);
  });

  it("counts only the current season toward season_xp", async () => {
    const [past] = await db.sql<{ id: string }[]>`
      INSERT INTO seasons (school_id, name, starts_on, ends_on, is_current)
      VALUES (${schoolA.schoolId}, 'Fixture Past Quarter', CURRENT_DATE - 200, CURRENT_DATE - 120, false)
      RETURNING id
    `;
    await db.sql`
      INSERT INTO xp_ledger (school_id, profile_id, season_id, delta, participation_type, source_type)
      VALUES (${schoolA.schoolId}, ${schoolA.learnerProfileId}, ${past!.id}, 55, 'attend_event', 'checkin')
    `;

    const [row] = await asUser(db.sql, learnerOf(schoolA), async (tx) => {
      return tx<{ lifetime_xp: number; season_xp: number; current_season_id: string }[]>`
        SELECT lifetime_xp, season_xp, current_season_id FROM xp_balances
        WHERE profile_id = ${schoolA.learnerProfileId}`;
    });
    expect(row?.lifetime_xp).toBe(65);
    expect(row?.season_xp).toBe(10);
    expect(row?.current_season_id).toBe(schoolA.seasonId);
  });
});
