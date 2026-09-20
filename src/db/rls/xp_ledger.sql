-- xp_ledger — append-only, for every role including admins (CLAUDE.md R4).
--
-- Three layers say the same thing, because this is the table whose credibility
-- the whole product rests on:
--   1. No UPDATE or DELETE grant is made, and any inherited one is revoked.
--   2. No UPDATE or DELETE policy exists.
--   3. A trigger (01_guards.sql) rejects the attempt even from the table owner.
--
-- Corrections are reversal rows citing the original. Balances are derived.
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_ledger FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.xp_ledger FROM anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.xp_ledger FROM PUBLIC;
-- Supabase's default privileges grant service_role ALL on every new table in
-- public, and a grant to a named role is not covered by a revoke from PUBLIC.
-- withServiceRole() runs as exactly this role, so without the line below the
-- one privileged path in the application could rewrite history (R4).
REVOKE UPDATE, DELETE, TRUNCATE ON public.xp_ledger FROM service_role;
GRANT SELECT, INSERT ON public.xp_ledger TO authenticated;

DROP POLICY IF EXISTS xp_ledger_select_self_or_staff ON public.xp_ledger;
CREATE POLICY xp_ledger_select_self_or_staff ON public.xp_ledger
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      profile_id = public.current_profile_id()
      OR public.is_school_admin()
      OR public.has_any_role(ARRAY[
        'org_adviser', 'sslg_officer', 'sslg_adviser', 'school_head', 'guidance'
      ])
    )
  );

-- Only manual adjustments and dispute resolutions are inserted by a session,
-- and only by the roles that set point values in the first place (FR-5.3).
--
-- Check-in-sourced XP does NOT come through here. It is written inside the same
-- transaction as the check-in by a SECURITY DEFINER function that verifies the
-- citing checkin row exists, landing with the check-in slice in Phase 3. An
-- officer's session therefore never holds a general "award XP" capability —
-- which is what stops a scanner device from being an XP faucet.
DROP POLICY IF EXISTS xp_ledger_insert_point_setters ON public.xp_ledger;
CREATE POLICY xp_ledger_insert_point_setters ON public.xp_ledger
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (public.is_school_admin() OR public.has_role('sslg_adviser'))
  );
