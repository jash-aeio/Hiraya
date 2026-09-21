-- ===========================================================================
-- Hiraya — the demo session source (D23)
--
-- Phase 0 has to walk browse -> register -> check in -> XP -> leaderboard before
-- the Phase 1 identity slice exists. The demo therefore needs a session, and a
-- session needs claims, and claims have to be resolved *before* any claims are
-- in force — which is the one read no tenancy policy can serve, because
-- current_school_id() is NULL and every policy fails closed by design.
--
-- Two functions answer that read, and nothing else. They are SECURITY DEFINER,
-- so they run as the owner and see past RLS — the same privilege the service
-- role holds, except that these cannot be aimed anywhere. Every row they can
-- return is filtered by `s.is_demo` in SQL, here, next to the data. A demo
-- session for a real tenant is therefore not a rule somebody has to remember in
-- a service: it is a row the function cannot reach.
--
-- That is the whole reason this lives in SQL rather than behind a fourth
-- AdminReason in src/lib/db/admin.ts. service_role could read any school; a
-- TypeScript `if (!school.isDemo)` is exactly the "application code that
-- remembers to filter" CLAUDE.md R1 exists to distrust.
--
-- Two properties worth stating because they are load-bearing:
--
--   * These functions READ. Neither writes, and neither takes a school_id from
--     the caller — the tenant comes from the profile row, so a caller cannot
--     name the school it would like to be in.
--   * A persona's display name leaves here, which is only acceptable because
--     `is_demo` guarantees it is synthetic (seed/README.md). No real learner
--     data exists in any environment before Gate B, and when it does, this
--     function still cannot see it.
--
-- STABLE and SET search_path = '' for the same reasons as 00_functions.sql: the
-- value is constant within a statement, and a caller must not be able to shadow
-- `profiles` with a table of their own earlier on their search_path. That
-- matters far more here, where the function runs as the owner.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The personas the switcher offers.
--
-- Only `active` profiles: the two seeded learners left without consent stay at
-- status `imported` so the activation gate can be shown refusing them, and
-- handing one a session would demonstrate the opposite of the thing they exist
-- to demonstrate.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.demo_personas()
RETURNS TABLE (
  profile_id uuid,
  school_id uuid,
  school_slug text,
  school_name text,
  display_name text,
  grade_level integer,
  section text,
  avatar_key text,
  roles text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.school_id,
    s.slug,
    s.name,
    p.display_name,
    p.grade_level,
    p.section,
    p.avatar_key,
    COALESCE(
      (SELECT array_agg(DISTINCT r.role::text ORDER BY r.role::text)
         FROM public.user_roles r
        WHERE r.profile_id = p.id),
      ARRAY[]::text[]
    )
  FROM public.profiles p
  JOIN public.schools s ON s.id = p.school_id
  WHERE s.is_demo
    AND p.status = 'active'
  ORDER BY
    -- Staff first: a pitch opens on the adviser, not on the fortieth learner.
    (CASE WHEN EXISTS (
       SELECT 1 FROM public.user_roles r
        WHERE r.profile_id = p.id AND r.role <> 'learner'
     ) THEN 0 ELSE 1 END),
    p.grade_level DESC NULLS FIRST,
    p.display_name
$$;

COMMENT ON FUNCTION public.demo_personas() IS
  'Personas the Phase 0 demo switcher may offer. Returns rows from is_demo schools only (D23).';

-- ---------------------------------------------------------------------------
-- The claims for one persona.
--
-- Returns zero rows for anything it may not speak for — a real tenant, an
-- inactive profile, an id that does not exist. Zero rows is the only refusal
-- shape: distinguishing "not a demo school" from "no such profile" would confirm
-- that a given profile exists somewhere in the system, which is the same reason
-- src/lib/errors.ts answers NOT_FOUND for a row in another school.
--
-- The first four columns mirror TenantClaims in src/lib/db/client.ts exactly,
-- because what comes out of here is fed straight into withTenant and read by the
-- policies in this directory. The demo runs under the rules the pilot will.
--
-- The last two are for the DEMO DATA marker, which has to name who it is showing
-- and which synthetic school they belong to. They ride along rather than costing
-- a second query, and a second query would be a second place to forget the gate.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.demo_session_claims(target_profile uuid)
RETURNS TABLE (
  school_id uuid,
  profile_id uuid,
  roles text[],
  org_grants jsonb,
  display_name text,
  school_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.school_id,
    p.id,
    COALESCE(
      (SELECT array_agg(DISTINCT r.role::text ORDER BY r.role::text)
         FROM public.user_roles r
        WHERE r.profile_id = p.id),
      ARRAY[]::text[]
    ),
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('org_id', r.org_id, 'role', r.role::text)
                        ORDER BY r.org_id, r.role::text)
         FROM public.user_roles r
        WHERE r.profile_id = p.id
          AND r.org_id IS NOT NULL),
      '[]'::jsonb
    ),
    p.display_name,
    s.name
  FROM public.profiles p
  JOIN public.schools s ON s.id = p.school_id
  WHERE p.id = target_profile
    AND s.is_demo
    AND p.status = 'active'
$$;

COMMENT ON FUNCTION public.demo_session_claims(uuid) IS
  'Tenant claims for one demo persona, or zero rows. is_demo is the gate, and it is a database fact (D23).';

-- ---------------------------------------------------------------------------
-- Who may call them.
--
-- Supabase grants ALL on new functions in `public` to anon, authenticated and
-- service_role by default privilege (scripts/bootstrap-roles.sql mirrors this
-- locally, so the revokes below are actually exercised by the suite). A
-- SECURITY DEFINER function left at its default grants is an RLS bypass
-- reachable by anyone who can reach the database.
--
-- `authenticated` only, because that is the role src/lib/db/client.ts drops to
-- before calling — the demo session is resolved at the same privilege level
-- every other request runs at. anon holds nothing here for the same reason it
-- holds nothing on any table. service_role holds nothing because it has no
-- business in a demo path: it would be reading past RLS for a reason that is
-- not on the list in src/lib/db/admin.ts.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.demo_personas() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.demo_session_claims(uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.demo_personas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.demo_session_claims(uuid) TO authenticated;
