import "server-only";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { isAllowedDemoSchool } from "@/lib/auth/demo-allowlist";
import { withoutClaims } from "@/lib/db/client";

import type { DemoSchool, Persona } from "./schema";

/**
 * The persona catalogue.
 *
 * This is the one read in the repository issued with no claims in force, and it
 * is the widest thing the demo exposes: names, grades and sections, to anyone,
 * with no session. Two independent things keep it synthetic —
 * `public.demo_personas()` filters on `s.is_demo` in SQL
 * (src/db/rls/02_demo_session.sql), and the loop below drops any school this
 * deployment was not configured to serve (src/lib/auth/demo-allowlist.ts).
 *
 * Drizzle's query builder is not used because there is no table to build
 * against — the whole point is that the primary gate lives in the database and
 * this file cannot widen it. The allowlist can only ever narrow.
 */

const personaRow = z.object({
  profile_id: z.uuid(),
  school_id: z.uuid(),
  school_slug: z.string(),
  school_name: z.string(),
  display_name: z.string(),
  // Postgres `integer` arrives as a number through postgres-js; staff have none.
  grade_level: z.number().int().nullable(),
  section: z.string().nullable(),
  avatar_key: z.string().nullable(),
  roles: z.array(z.string()),
});

export async function selectDemoPersonas(): Promise<DemoSchool[]> {
  const rows = await withoutClaims(async (tx) => {
    const result = await tx.execute(sql`select * from public.demo_personas()`);
    return result as unknown as unknown[];
  });

  // Parsed, not cast: `tx.execute` returns unknown, and a shape change in the
  // function should fail here rather than three layers up in a component.
  const parsed = z.array(personaRow).parse(rows);

  // The SQL orders staff first, then by grade. A Map keeps insertion order, so
  // grouping preserves that ordering within each school even when two synthetic
  // tenants interleave in the result.
  const schools = new Map<string, DemoSchool>();
  for (const row of parsed) {
    if (!isAllowedDemoSchool(row.school_slug)) continue;

    const persona: Persona = {
      profileId: row.profile_id,
      displayName: row.display_name,
      gradeLevel: row.grade_level,
      section: row.section,
      avatarKey: row.avatar_key,
      roles: row.roles,
    };

    const existing = schools.get(row.school_id);
    if (existing) {
      existing.personas.push(persona);
    } else {
      schools.set(row.school_id, {
        schoolId: row.school_id,
        slug: row.school_slug,
        name: row.school_name,
        personas: [persona],
      });
    }
  }

  return [...schools.values()];
}

const rolledRow = z.object({ demo_roll_live_events: z.number().int() });

/**
 * Re-centres this demo school's standing live event on now (D-07).
 *
 * Returns how many events moved — 0 while the window still covers now, which is
 * the common case and writes nothing. The gate is `is_demo` inside
 * public.demo_roll_live_events (src/db/rls/08_demo_rolling_event.sql), not a
 * check here: a school id is an argument, and an argument is the one thing a
 * caller controls.
 *
 * `withoutClaims` rather than `withTenant`, for the same reason the two reads
 * above use it — this runs while a session is being established, before claims
 * exist to present. The function is SECURITY DEFINER, so it writes past RLS;
 * what it may write is bounded by its own WHERE clause rather than by a policy.
 */
export async function rollLiveEvents(schoolId: string): Promise<number> {
  const rows = await withoutClaims(async (tx) => {
    const result = await tx.execute(
      sql`select * from public.demo_roll_live_events(${schoolId}::uuid)`,
    );
    return result as unknown as unknown[];
  });

  const row = rolledRow.safeParse(rows[0]);
  return row.success ? row.data.demo_roll_live_events : 0;
}
