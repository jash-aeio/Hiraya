-- levels — Kasapi, Lingkod, Tagapagtaguyod, Bayani. Thresholds are product
-- parameters tuned during the pilot, so they are editable, by School Admin only.
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.levels FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.levels TO authenticated;

DROP POLICY IF EXISTS levels_select_tenant ON public.levels;
CREATE POLICY levels_select_tenant ON public.levels
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS levels_insert_admin ON public.levels;
CREATE POLICY levels_insert_admin ON public.levels
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());

DROP POLICY IF EXISTS levels_update_admin ON public.levels;
CREATE POLICY levels_update_admin ON public.levels
  FOR UPDATE TO authenticated
  USING (school_id = public.current_school_id() AND public.is_school_admin())
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());
