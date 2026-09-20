-- profiles — names, grade and section. Visible to schoolmates by design: the
-- paper world already works this way. Cross-school visibility is the failure
-- this file exists to prevent.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM anon, authenticated;
-- No DELETE grant: a learner who leaves is archived, never deleted, because the
-- school must keep participation records (threat T14, docs/SYSTEM_DESIGN.md §10).
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_select_tenant ON public.profiles;
CREATE POLICY profiles_select_tenant ON public.profiles
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

-- Roster import only.
DROP POLICY IF EXISTS profiles_insert_admin ON public.profiles;
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());

-- A learner may edit their own row (avatar, locale, board visibility); School
-- Admin may edit any row in the school. Which columns each may change is
-- enforced in the service and its Zod schema — RLS is row-level and cannot
-- express it. school_id itself is immutable by trigger (01_guards.sql).
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (id = public.current_profile_id() OR public.is_school_admin())
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (id = public.current_profile_id() OR public.is_school_admin())
  );
