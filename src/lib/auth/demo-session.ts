import "server-only";

import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";

import { withoutClaims } from "@/lib/db/client";
import type { TenantClaims } from "@/lib/db/client";

/**
 * The Phase 0 demo session (D23).
 *
 * This is a second session source, and it is deliberately not a bypass. A demo
 * session carries real `TenantClaims`, goes through `withTenant`, and is read by
 * the same policies in src/db/rls/ that the pilot will run under — so the demo
 * proves the tenancy rules rather than stepping around them to look good.
 *
 * Three properties make that true, and none of them live in this file by
 * accident:
 *
 *   1. **The cookie is a pointer, not a claim.** It holds one profile id and
 *      nothing else. Claims are re-derived from the database on every request,
 *      so there is nothing in it to forge: editing it can at most name a
 *      different profile, and naming a profile is exactly what the gate checks.
 *      A cookie that carried `roles` would be a cookie that grants roles.
 *
 *   2. **The gate is a database fact.** `public.demo_session_claims` returns
 *      rows only for a school flagged `is_demo` (src/db/rls/02_demo_session.sql).
 *      Not an env var — an env var is a fact about a deployment, forgeable by
 *      whoever can set one, and it would make the difference between the demo
 *      and the pilot a configuration mistake away.
 *
 *   3. **It fails closed.** No cookie, a malformed cookie, a profile in a real
 *      tenant, an inactive profile: all resolve to null, and every guarded
 *      endpoint answers 401.
 *
 * Why session plumbing and not src/features/demo/service.ts: resolving a session
 * is what `src/lib/auth/session.ts` does, and Phase 1 replaces the call below
 * with a Supabase Auth one in the same place. The feature owns the persona
 * catalogue and the switching UI; it does not own what a session is.
 */

export const DEMO_SESSION_COOKIE = "HIRAYA_DEMO_PERSONA";

/**
 * Eight hours: a demo session should not outlive the day it was shown in. It is
 * short for the same reason it is httpOnly — not because a synthetic tenant is
 * sensitive, but because this cookie's handling is the habit that carries into
 * Phase 1, where it will be a real learner's session.
 */
const MAX_AGE_SECONDS = 60 * 60 * 8;

const UUID = z.uuid();

/**
 * Column names are the SQL function's, snake_case, and are parsed rather than
 * trusted: `tx.execute` hands back `unknown`, and CLAUDE.md R7 means no `unknown`
 * becomes a typed value without a Zod parse, including one from our own database.
 */
const claimsRow = z.object({
  school_id: UUID,
  profile_id: UUID,
  roles: z.array(z.string()),
  org_grants: z.array(z.object({ org_id: UUID, role: z.string() })),
  display_name: z.string(),
  school_name: z.string(),
});

export interface DemoSession {
  claims: TenantClaims;
  /** Synthetic, by construction: the gate returns nothing from a real tenant. */
  displayName: string;
  schoolName: string;
}

/**
 * Resolves one persona to a session, or null if this profile may not have one.
 *
 * Null is the only refusal: "not a demo tenant", "no such profile" and "not
 * active" are indistinguishable from here, because the function returns zero
 * rows for all three. Telling them apart would confirm that a given profile
 * exists somewhere in the system.
 */
export async function resolveDemoSession(profileId: string): Promise<DemoSession | null> {
  if (!UUID.safeParse(profileId).success) return null;

  const rows = await withoutClaims(async (tx) => {
    const result = await tx.execute(
      sql`select * from public.demo_session_claims(${profileId}::uuid)`,
    );
    return result as unknown as unknown[];
  });

  const row = claimsRow.safeParse(rows[0]);
  if (!row.success) return null;

  return {
    claims: {
      schoolId: row.data.school_id,
      profileId: row.data.profile_id,
      roles: row.data.roles,
      orgGrants: row.data.org_grants.map((g) => ({ orgId: g.org_id, role: g.role })),
    },
    displayName: row.data.display_name,
    schoolName: row.data.school_name,
  };
}

/** The persona id this request carries, if it carries a well-formed one. */
export function readDemoPersonaId(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== DEMO_SESSION_COOKIE) continue;

    const value = decodeURIComponent(part.slice(separator + 1).trim());
    return UUID.safeParse(value).success ? value : null;
  }
  return null;
}

/** The same value, for Server Components, which have no Request to read. */
export async function readDemoPersonaIdFromStore(): Promise<string | null> {
  const value = (await cookies()).get(DEMO_SESSION_COOKIE)?.value;
  return value !== undefined && UUID.safeParse(value).success ? value : null;
}

/**
 * Cookie writes live here rather than in the service, because a cookie is HTTP
 * and a service must not know about HTTP (docs/SYSTEM_DESIGN.md §8). Route
 * handlers call these; the service only decides whether a session is allowed.
 */
export async function setDemoPersonaCookie(profileId: string): Promise<void> {
  (await cookies()).set(DEMO_SESSION_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearDemoPersonaCookie(): Promise<void> {
  (await cookies()).delete(DEMO_SESSION_COOKIE);
}
