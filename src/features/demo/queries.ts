import "server-only";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { withoutClaims } from "@/lib/db/client";

import type { DemoSchool, Persona } from "./schema";

/**
 * The persona catalogue.
 *
 * This is the one read in the repository issued with no claims in force, and it
 * is safe for exactly one reason: `public.demo_personas()` filters on
 * `s.is_demo` in SQL (src/db/rls/02_demo_session.sql). Drizzle's query builder
 * is not used because there is no table to build against — the whole point is
 * that the gate lives in the database and this file cannot widen it.
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
