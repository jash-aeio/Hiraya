import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { verifyRls } from "../../scripts/verify-rls";
import { asUser, reapplyRls, startTestDatabase } from "./helpers/db";
import type { TestDatabase } from "./helpers/db";
import { TENANT_TABLES, seedTenant } from "./helpers/fixtures";
import type { Tenant } from "./helpers/fixtures";

/**
 * The first of the two non-negotiable tests (CLAUDE.md §5):
 *
 *   A user from school A cannot read any row belonging to school B.
 *
 * "Any row" means every table, which is why this file enumerates them from the
 * live schema rather than from a list someone maintains by hand. The second
 * non-negotiable test — replaying an offline queue awards no duplicate XP —
 * lands with the check-in slice in Phase 3; the constraint it will lean on
 * (`checkins_event_profile_jti_key`) is asserted here already.
 */

let db: TestDatabase;
let schoolA: Tenant;
let schoolB: Tenant;

beforeAll(async () => {
  db = await startTestDatabase();
  schoolA = await seedTenant(db.sql, "school-a");
  schoolB = await seedTenant(db.sql, "school-b");
}, 300_000);

afterAll(async () => {
  await db?.sql?.end();
  await db?.stop();
});

function adminOf(tenant: Tenant) {
  return {
    schoolId: tenant.schoolId,
    profileId: tenant.adminProfileId,
    roles: ["school_admin"],
    orgGrants: [{ orgId: tenant.orgId, role: "org_adviser" }],
  };
}

function learnerOf(tenant: Tenant) {
  return {
    schoolId: tenant.schoolId,
    profileId: tenant.learnerProfileId,
    roles: ["learner"],
    orgGrants: [],
  };
}

describe("schema coverage", () => {
  it("seeds every table that carries a school_id", async () => {
    const rows = await db.sql<{ table_name: string }[]>`
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN information_schema.columns col
        ON col.table_schema = 'public' AND col.table_name = c.relname AND col.column_name = 'school_id'
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `;
    const live = rows.map((r) => r.table_name).sort();
    // If this fails, a migration added a table and the cross-tenant test below is
    // no longer covering the schema. Seed it in fixtures.ts before shipping.
    expect(live).toEqual([...TENANT_TABLES].sort());
  });
});

describe("tenant isolation (CLAUDE.md R1)", () => {
  it("shows school A its own rows in every table", async () => {
    await asUser(db.sql, adminOf(schoolA), async (tx) => {
      for (const table of TENANT_TABLES) {
        const [row] = await tx<{ count: number }[]>`
          SELECT count(*)::int AS count FROM ${tx(table)} WHERE school_id = ${schoolA.schoolId}
        `;
        expect(row?.count, `${table} should be visible to its own school`).toBeGreaterThan(0);
      }
    });
  });

  it("hides every school B row from school A", async () => {
    await asUser(db.sql, adminOf(schoolA), async (tx) => {
      for (const table of TENANT_TABLES) {
        const [row] = await tx<{ count: number }[]>`
          SELECT count(*)::int AS count FROM ${tx(table)} WHERE school_id = ${schoolB.schoolId}
        `;
        expect(row?.count, `${table} leaks rows across tenants`).toBe(0);
      }
    });
  });

  it("hides school B's school row itself", async () => {
    await asUser(db.sql, adminOf(schoolA), async (tx) => {
      const rows = await tx<{ id: string }[]>`SELECT id FROM schools`;
      expect(rows.map((r) => r.id)).toEqual([schoolA.schoolId]);
    });
  });

  it("refuses to write a row into another school", async () => {
    await expect(
      asUser(db.sql, adminOf(schoolA), async (tx) => {
        await tx`
          INSERT INTO profiles (school_id, username, display_name)
          VALUES (${schoolB.schoolId}, 'smuggled', 'Smuggled Row')
        `;
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  it("refuses to move an existing row between schools", async () => {
    await expect(
      asUser(db.sql, adminOf(schoolA), async (tx) => {
        await tx`
          UPDATE profiles SET school_id = ${schoolB.schoolId} WHERE id = ${schoolA.learnerProfileId}
        `;
      }),
    ).rejects.toThrow(/tenant_immutable/);
  });

  it("would notice if RLS were switched off", async () => {
    // A denial test that passes against an unprotected database is testing
    // nothing. This disables the protection, proves the leak appears, and puts it
    // back — so the assertions above are known to depend on RLS and not on the
    // fixtures happening to be empty.
    await db.sql`ALTER TABLE profiles DISABLE ROW LEVEL SECURITY`;
    try {
      const leaked = await asUser(db.sql, adminOf(schoolA), async (tx) => {
        const [row] = await tx<{ count: number }[]>`
          SELECT count(*)::int AS count FROM profiles WHERE school_id = ${schoolB.schoolId}
        `;
        return row?.count ?? 0;
      });
      expect(leaked).toBeGreaterThan(0);
    } finally {
      await db.sql`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`;
      await reapplyRls(db.url);
    }

    // And protection is genuinely restored.
    await asUser(db.sql, adminOf(schoolA), async (tx) => {
      const [row] = await tx<{ count: number }[]>`
        SELECT count(*)::int AS count FROM profiles WHERE school_id = ${schoolB.schoolId}
      `;
      expect(row?.count).toBe(0);
    });
  });
});

describe("LRN confidentiality (CLAUDE.md §6)", () => {
  it("returns no LRN hash to a learner, even their own", async () => {
    await asUser(db.sql, learnerOf(schoolA), async (tx) => {
      const rows = await tx`SELECT lrn_hmac FROM profile_identifiers`;
      expect(rows).toHaveLength(0);
    });
  });

  it("returns LRN hashes to School Admin, for its own school only", async () => {
    await asUser(db.sql, adminOf(schoolA), async (tx) => {
      const rows = await tx<{ school_id: string }[]>`SELECT school_id FROM profile_identifiers`;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.school_id).toBe(schoolA.schoolId);
    });
  });
});

describe("append-only ledger (CLAUDE.md R4)", () => {
  it("lets School Admin read the ledger but not update it", async () => {
    await expect(
      asUser(db.sql, adminOf(schoolA), async (tx) => {
        await tx`UPDATE xp_ledger SET delta = 9999 WHERE school_id = ${schoolA.schoolId}`;
      }),
    ).rejects.toThrow(/permission denied/i);
  });

  it("lets School Admin read the ledger but not delete from it", async () => {
    await expect(
      asUser(db.sql, adminOf(schoolA), async (tx) => {
        await tx`DELETE FROM xp_ledger WHERE school_id = ${schoolA.schoolId}`;
      }),
    ).rejects.toThrow(/permission denied/i);
  });

  it("rejects a ledger rewrite even from the table owner", async () => {
    // The grant stops `authenticated`. The trigger is what makes the claim true
    // of anyone with direct database access, which is the case that matters when
    // the school's own ICT club holds the credentials.
    await expect(db.sql`UPDATE xp_ledger SET delta = 9999`).rejects.toThrow(
      /append_only_violation/,
    );
    await expect(db.sql`DELETE FROM xp_ledger`).rejects.toThrow(/append_only_violation/);
  });

  it("rejects an audit log rewrite even from the table owner", async () => {
    await expect(db.sql`UPDATE audit_log SET action = 'tampered'`).rejects.toThrow(
      /append_only_violation/,
    );
  });

  it("accepts a correction as a new reversal row", async () => {
    const [original] = await db.sql<{ id: string }[]>`
      SELECT id FROM xp_ledger WHERE school_id = ${schoolA.schoolId} LIMIT 1
    `;
    await asUser(db.sql, adminOf(schoolA), async (tx) => {
      await tx`
        INSERT INTO xp_ledger (school_id, profile_id, season_id, delta, source_type, reversal_of, reason)
        VALUES (${schoolA.schoolId}, ${schoolA.learnerProfileId}, ${schoolA.seasonId}, -10,
                'reversal', ${original!.id}, 'fixture correction')
      `;
    });
    const [count] = await db.sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM xp_ledger WHERE reversal_of = ${original!.id}
    `;
    expect(count?.count).toBe(1);
  });

  it("does not let a learner award themselves XP", async () => {
    await expect(
      asUser(db.sql, learnerOf(schoolA), async (tx) => {
        await tx`
          INSERT INTO xp_ledger (school_id, profile_id, season_id, delta, source_type)
          VALUES (${schoolA.schoolId}, ${schoolA.learnerProfileId}, ${schoolA.seasonId}, 500, 'manual_adjustment')
        `;
      }),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("check-in integrity foundations", () => {
  it("does not let a learner write their own attendance", async () => {
    await expect(
      asUser(db.sql, learnerOf(schoolA), async (tx) => {
        await tx`
          INSERT INTO checkins (school_id, event_id, profile_id, jti, scanned_at, method)
          VALUES (${schoolA.schoolId}, ${schoolA.eventId}, ${schoolA.learnerProfileId},
                  'self-issued', now(), 'learner_scan')
        `;
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  it("enforces the (event_id, profile_id, jti) idempotency key", async () => {
    // What makes replaying an entire offline queue a no-op (R6). The sync
    // endpoint relies on this constraint rather than on checking first.
    await expect(
      db.sql`
        INSERT INTO checkins (school_id, event_id, profile_id, jti, scanned_at, method)
        VALUES (${schoolA.schoolId}, ${schoolA.eventId}, ${schoolA.learnerProfileId},
                ${"jti-school-a-001"}, now(), 'officer_scan')
      `,
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("hides an unapproved event from learners", async () => {
    const [draft] = await db.sql<{ id: string }[]>`
      INSERT INTO events (school_id, org_id, title, starts_at, ends_at, status)
      VALUES (${schoolA.schoolId}, ${schoolA.orgId}, 'Unapproved Draft',
              now() + interval '1 day', now() + interval '2 days', 'draft')
      RETURNING id
    `;
    await asUser(db.sql, learnerOf(schoolA), async (tx) => {
      const rows = await tx`SELECT id FROM events WHERE id = ${draft!.id}`;
      expect(rows).toHaveLength(0);
    });
  });
});

describe("db:verify-rls", () => {
  it("reports no findings against the migrated schema", async () => {
    const findings = await verifyRls(db.url);
    expect(findings.map((f) => `${f.severity} ${f.detail}`)).toEqual([]);
  });
});
