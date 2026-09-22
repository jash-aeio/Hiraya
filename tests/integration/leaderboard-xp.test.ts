import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { asUser, startTestDatabase } from "./helpers/db";
import type { TestClaims, TestDatabase } from "./helpers/db";
import { seedTenant } from "./helpers/fixtures";
import type { Tenant } from "./helpers/fixtures";

/**
 * The XP read and the leaderboard (D-03, D-04, FR-5.1, FR-5.4, FR-5.6, FR-5.8).
 *
 * `xp_balances` is exercised against a learner's *own* policy rather than the
 * owner connection, because its whole security property is `security_invoker =
 * true` (D19) — read as the owner it would look right and prove nothing.
 *
 * The board is exercised through `public.leaderboard`, which publishes rows a
 * learner cannot otherwise read. Two of its rules are tested rather than
 * assumed: a hidden learner is absent from the rows and still sees their own
 * rank, and the visible ranks have no gap where that learner would have been.
 */

let db: TestDatabase;
let schoolA: Tenant;
let schoolB: Tenant;

interface Learner {
  id: string;
  name: string;
  xp: number;
  hidden: boolean;
  section: string;
  grade: number;
}

const roster: Learner[] = [
  { id: "", name: "Fixture Top", xp: 300, hidden: false, section: "Sampaguita", grade: 9 },
  { id: "", name: "Fixture Hidden", xp: 250, hidden: true, section: "Sampaguita", grade: 9 },
  { id: "", name: "Fixture Second", xp: 200, hidden: false, section: "Sampaguita", grade: 9 },
  { id: "", name: "Fixture Third", xp: 100, hidden: false, section: "Ilang-Ilang", grade: 9 },
  { id: "", name: "Fixture Other Grade", xp: 400, hidden: false, section: "Rosal", grade: 10 },
  { id: "", name: "Fixture Zero", xp: 0, hidden: false, section: "Sampaguita", grade: 9 },
];

let seasonId: string;

function claimsFor(learner: Learner): TestClaims {
  return { schoolId: schoolA.schoolId, profileId: learner.id, roles: ["learner"] };
}

function find(name: string): Learner {
  const learner = roster.find((r) => r.name === name);
  if (!learner) throw new Error(`No fixture learner named ${name}`);
  return learner;
}

interface BoardRow {
  l_kind: string;
  l_rank: number | null;
  l_profile_id: string;
  l_display_name: string;
  l_xp: number;
  l_level_title: string | null;
  l_hidden: boolean;
  l_season_id: string | null;
}

async function board(
  claims: TestClaims,
  scope: string,
  options: { ref?: string | null; season?: string | null; limit?: number } = {},
): Promise<BoardRow[]> {
  return asUser(db.sql, claims, async (tx) => {
    return tx<BoardRow[]>`
      SELECT * FROM public.leaderboard(
        ${scope}::text,
        ${options.ref ?? null}::text,
        ${options.season ?? null}::uuid,
        ${options.limit ?? 20}::integer
      )
    `;
  });
}

const rowsOf = (result: BoardRow[]) => result.filter((r) => r.l_kind === "row");
const viewerOf = (result: BoardRow[]) => result.find((r) => r.l_kind === "viewer");

beforeAll(async () => {
  db = await startTestDatabase();
  schoolA = await seedTenant(db.sql, "lb-a");
  schoolB = await seedTenant(db.sql, "lb-b");

  // `seedTenant` already seeds the current season and level 1 (Kasapi at 0),
  // and gives its own learner 10 XP. Building on that rather than beside it
  // keeps a second is_current season out of the database — two of those would
  // make every seasonal total depend on which one a query picked.
  seasonId = schoolA.seasonId;

  await db.sql`
    INSERT INTO levels (school_id, level_number, threshold_xp, title, badge_key)
    VALUES (${schoolA.schoolId}, 2, 150, 'Lingkod', 'badge-lingkod'),
           (${schoolA.schoolId}, 3, 280, 'Tagapagtaguyod', 'badge-tagapagtaguyod'),
           (${schoolA.schoolId}, 4, 500, 'Bayani', 'badge-bayani')
  `;

  for (const learner of roster) {
    const [row] = await db.sql<{ id: string }[]>`
      INSERT INTO profiles (school_id, username, display_name, grade_level, section,
                            hidden_from_boards, status)
      VALUES (${schoolA.schoolId}, ${`lb-${learner.name.replace(/\s+/g, "-").toLowerCase()}`},
              ${learner.name}, ${learner.grade}, ${learner.section},
              ${learner.hidden}, 'active')
      RETURNING id
    `;
    learner.id = row!.id;

    if (learner.xp > 0) {
      // Written as a manual adjustment by the admin, which is a real ledger
      // path (the check-in path has its own suite). What matters to a board is
      // that the rows exist and carry a season.
      await db.sql`
        INSERT INTO xp_ledger (school_id, profile_id, season_id, delta, source_type,
                               source_id, awarded_by)
        VALUES (${schoolA.schoolId}, ${row!.id}, ${seasonId}, ${learner.xp},
                'manual_adjustment', ${randomUUID()}, ${schoolA.adminProfileId})
      `;
    }
  }
}, 300_000);

afterAll(async () => {
  await db?.sql?.end();
  await db?.stop();
});

describe("xp_balances under the reader's own policy (D19)", () => {
  it("shows a learner their own total and the level it reaches", async () => {
    const top = find("Fixture Top");
    const rows = await asUser(db.sql, claimsFor(top), async (tx) => {
      return tx<{
        lifetime_xp: number;
        season_xp: number;
        level_title: string | null;
        next_threshold_xp: number | null;
      }[]>`SELECT lifetime_xp, season_xp, level_title, next_threshold_xp FROM xp_balances`;
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]!.lifetime_xp).toBe(300);
    expect(rows[0]!.season_xp).toBe(300);
    // 300 clears Tagapagtaguyod at 280; Bayani at 500 is what is left to climb.
    expect(rows[0]!.level_title).toBe("Tagapagtaguyod");
    expect(rows[0]!.next_threshold_xp).toBe(500);
  });

  it("shows a learner nobody else's balance, which is what makes the board a publication", async () => {
    const second = find("Fixture Second");
    const rows = await asUser(db.sql, claimsFor(second), async (tx) => {
      return tx<{ profile_id: string }[]>`SELECT profile_id FROM xp_balances`;
    });

    expect(rows.map((r) => r.profile_id)).toEqual([second.id]);
  });

  it("gives a learner with no ledger rows no row at all, rather than a zero", async () => {
    const zero = find("Fixture Zero");
    const rows = await asUser(db.sql, claimsFor(zero), async (tx) => {
      return tx<{ profile_id: string }[]>`SELECT profile_id FROM xp_balances`;
    });

    // A zero row would be indistinguishable from "you may not see this
    // learner"; rendering the absence as 0 XP is the service's job.
    expect(rows).toHaveLength(0);
  });
});

describe("the school board", () => {
  it("ranks the visible learners by points", async () => {
    const result = await board(claimsFor(find("Fixture Second")), "school");
    const rows = rowsOf(result);

    expect(rows.map((r) => r.l_display_name)).toEqual([
      "Fixture Other Grade",
      "Fixture Top",
      "Fixture Second",
      "Fixture Third",
      // seedTenant's own learner, on 10 XP.
      "Fixture Learner",
    ]);
    expect(rows.map((r) => r.l_rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("leaves a learner with no points off the board entirely", async () => {
    const result = await board(claimsFor(find("Fixture Top")), "school");
    expect(rowsOf(result).map((r) => r.l_display_name)).not.toContain("Fixture Zero");
  });

  it("carries the level title each learner has reached", async () => {
    const result = await board(claimsFor(find("Fixture Top")), "school");
    const top = rowsOf(result).find((r) => r.l_display_name === "Fixture Top");
    expect(top!.l_level_title).toBe("Tagapagtaguyod");
  });
});

describe("a hidden learner (FR-5.8)", () => {
  it("is absent from the rows everyone else reads", async () => {
    const result = await board(claimsFor(find("Fixture Second")), "school");
    expect(rowsOf(result).map((r) => r.l_display_name)).not.toContain("Fixture Hidden");
  });

  it("leaves no gap where they would have been, which would announce them", async () => {
    // Hidden sits between Top (300) and Second (200) on points. Ranking over
    // everyone and then dropping the row would produce 1, 2, 4 — and the gap
    // would tell the school both that somebody is hidden and roughly where.
    const result = await board(claimsFor(find("Fixture Second")), "school");
    const ranks = rowsOf(result).map((r) => r.l_rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => (a ?? 0) - (b ?? 0)));
    expect(new Set(ranks).size).toBe(ranks.length);
    expect(ranks).toEqual([1, 2, 3, 4, 5]);
  });

  it("still sees their own rank, and is told they are hidden", async () => {
    const hidden = find("Fixture Hidden");
    const result = await board(claimsFor(hidden), "school");
    const viewer = viewerOf(result);

    expect(viewer!.l_hidden).toBe(true);
    expect(viewer!.l_xp).toBe(250);
    // Behind Other Grade (400) and Top (300): the rank they would hold.
    expect(viewer!.l_rank).toBe(3);
    // And they are not in their own rows either — the board they see is the
    // board everyone sees.
    expect(rowsOf(result).map((r) => r.l_display_name)).not.toContain("Fixture Hidden");
  });

  it("gives a learner with no points a viewer row with no rank", async () => {
    const result = await board(claimsFor(find("Fixture Zero")), "school");
    const viewer = viewerOf(result);

    expect(viewer).toBeDefined();
    expect(viewer!.l_xp).toBe(0);
    expect(viewer!.l_rank).toBeNull();
  });
});

describe("scopes", () => {
  it("reads section and grade from the caller's own profile, ignoring what they ask for", async () => {
    const second = find("Fixture Second"); // 9-Sampaguita
    const asked = await board(claimsFor(second), "section", { ref: "Rosal" });

    // Rosal holds only "Fixture Other Grade". Sampaguita is what comes back.
    const names = rowsOf(asked).map((r) => r.l_display_name);
    expect(names).toContain("Fixture Top");
    expect(names).not.toContain("Fixture Other Grade");
    expect(names).not.toContain("Fixture Third"); // Ilang-Ilang
  });

  it("scopes a grade board to the caller's own grade", async () => {
    const result = await board(claimsFor(find("Fixture Second")), "grade");
    expect(rowsOf(result).map((r) => r.l_display_name)).not.toContain("Fixture Other Grade");
  });

  it("scopes an org board to its active members", async () => {
    const top = find("Fixture Top");
    await db.sql`
      INSERT INTO org_memberships (school_id, org_id, profile_id, status)
      VALUES (${schoolA.schoolId}, ${schoolA.orgId}, ${top.id}, 'active')
    `;

    const result = await board(claimsFor(top), "org", { ref: schoolA.orgId });
    const names = rowsOf(result).map((r) => r.l_display_name);
    expect(names).toContain("Fixture Top");
    expect(names).not.toContain("Fixture Second");
  });

  it("answers an unknown scope with an error rather than a school-wide board", async () => {
    await expect(board(claimsFor(find("Fixture Top")), "district")).rejects.toThrow(
      /unknown scope/,
    );
  });

  it("answers an org scope with no reference as an empty board", async () => {
    const result = await board(claimsFor(find("Fixture Top")), "org");
    expect(rowsOf(result)).toHaveLength(0);
  });
});

describe("tenancy", () => {
  it("shows a learner of another school nothing of this one (R1)", async () => {
    const result = await board(
      { schoolId: schoolB.schoolId, profileId: schoolB.learnerProfileId, roles: ["learner"] },
      "school",
    );

    // Compared by id, not by name: school B has synthetic learners of its own
    // and some of them are called "Fixture ..." too.
    const ids = rowsOf(result).map((r) => r.l_profile_id);
    for (const learner of roster) {
      expect(ids).not.toContain(learner.id);
    }
  });

  it("refuses another school's season id, rather than ranking against it", async () => {
    const result = await board(
      { schoolId: schoolB.schoolId, profileId: schoolB.learnerProfileId, roles: ["learner"] },
      "school",
      { season: seasonId },
    );
    expect(result).toHaveLength(0);
  });

  it("returns nothing at all without claims, because every board is a tenant's", async () => {
    const rows = await db.sql.begin(async (tx) => {
      await tx`set local role authenticated`;
      return tx<BoardRow[]>`SELECT * FROM public.leaderboard('school'::text, NULL, NULL, 20)`;
    });
    expect(rows).toHaveLength(0);
  });
});
