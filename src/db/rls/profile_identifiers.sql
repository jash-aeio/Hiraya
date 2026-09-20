-- profile_identifiers — the LRN HMAC, and nothing else.
--
-- "LRN is never returned below School Admin" (CLAUDE.md §6) is enforceable in
-- the database only because this value lives in its own row. No SELECT policy
-- admits a learner, an officer or an adviser, so no query path below School
-- Admin can return it even by mistake.
ALTER TABLE public.profile_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_identifiers FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.profile_identifiers FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profile_identifiers TO authenticated;

DROP POLICY IF EXISTS profile_identifiers_select_admin ON public.profile_identifiers;
CREATE POLICY profile_identifiers_select_admin ON public.profile_identifiers
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id() AND public.is_school_admin());

DROP POLICY IF EXISTS profile_identifiers_insert_admin ON public.profile_identifiers;
CREATE POLICY profile_identifiers_insert_admin ON public.profile_identifiers
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());

-- Re-running an import updates the hash in place; that is what makes import
-- idempotent rather than duplicating learners (FR-1.1).
DROP POLICY IF EXISTS profile_identifiers_update_admin ON public.profile_identifiers;
CREATE POLICY profile_identifiers_update_admin ON public.profile_identifiers
  FOR UPDATE TO authenticated
  USING (school_id = public.current_school_id() AND public.is_school_admin())
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());
