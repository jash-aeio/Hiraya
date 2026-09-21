import "server-only";

import type { TenantClaims } from "@/lib/db/client";
import { errors } from "@/lib/errors";

import { readDemoPersonaId, resolveDemoSession } from "./demo-session";

/**
 * Session and role resolution.
 *
 * Phase 0 has one session source: the `is_demo`-gated persona switcher (D23,
 * src/lib/auth/demo-session.ts). Phase 1 adds the real one — Supabase Auth
 * verifies the token, the profile and its roles are read once, and the claims
 * below are what RLS then reads (docs/DATA_FLOW.md §3).
 *
 * The one rule that must survive that work: claims come from the verified token,
 * never from the request. An endpoint that reads school_id out of a body or a
 * query string has undone every policy in src/db/rls/. The demo source obeys it
 * too — the cookie names a profile, and the claims are read from the database.
 */

export type Session = TenantClaims;

export async function resolveSession(request: Request): Promise<Session | null> {
  // Phase 1 (identity slice) tries Supabase Auth here first, and the demo source
  // stays the fallback rather than the override: a real session must never be
  // displaceable by a cookie, whatever `is_demo` says about some other tenant.
  const personaId = readDemoPersonaId(request);
  if (!personaId) return null;

  const demo = await resolveDemoSession(personaId);
  return demo?.claims ?? null;
}

export async function requireSession(request: Request): Promise<Session> {
  const session = await resolveSession(request);
  if (!session) throw errors.unauthenticated();
  return session;
}

/**
 * The handler-side half of the two-layer authorization model: RLS is the
 * guarantee, this is the good error message. A role check that returns 403 and
 * names the missing role is worth keeping even though the policy would already
 * have returned an empty set — an empty set is indistinguishable from "there is
 * nothing here", which sends advisers to the ICT coordinator instead of to the
 * person who can grant them the role.
 */
export function requireRole(session: Session, ...allowed: string[]): void {
  if (allowed.length === 0) return;
  const ok = allowed.some((role) => session.roles.includes(role));
  if (!ok) throw errors.forbidden(allowed.join(" | "));
}

export function hasOrgRole(session: Session, role: string, orgId: string): boolean {
  return session.orgGrants.some((g) => g.role === role && g.orgId === orgId);
}
