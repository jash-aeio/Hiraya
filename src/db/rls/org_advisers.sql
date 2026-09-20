-- org_advisers — who supervises an organization. Only School Admin writes here:
-- an adviser appointing advisers is a staffing decision, not an app action.
ALTER TABLE public.org_advisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_advisers FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.org_advisers FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_advisers TO authenticated;

DROP POLICY IF EXISTS org_advisers_select_tenant ON public.org_advisers;
CREATE POLICY org_advisers_select_tenant ON public.org_advisers
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS org_advisers_insert_admin ON public.org_advisers;
CREATE POLICY org_advisers_insert_admin ON public.org_advisers
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());

DROP POLICY IF EXISTS org_advisers_update_admin ON public.org_advisers;
CREATE POLICY org_advisers_update_admin ON public.org_advisers
  FOR UPDATE TO authenticated
  USING (school_id = public.current_school_id() AND public.is_school_admin())
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());

DROP POLICY IF EXISTS org_advisers_delete_admin ON public.org_advisers;
CREATE POLICY org_advisers_delete_admin ON public.org_advisers
  FOR DELETE TO authenticated
  USING (school_id = public.current_school_id() AND public.is_school_admin());
