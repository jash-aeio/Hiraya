-- organizations — the Discover Orgs directory. School-wide readable; writable
-- by the org's own officers and adviser.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.organizations FROM anon, authenticated;
-- No DELETE grant: an org that folds is set inactive, so its past events and
-- the participation records attached to them survive.
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;

DROP POLICY IF EXISTS organizations_select_tenant ON public.organizations;
CREATE POLICY organizations_select_tenant ON public.organizations
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS organizations_insert_admin ON public.organizations;
CREATE POLICY organizations_insert_admin ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());

DROP POLICY IF EXISTS organizations_update_insiders ON public.organizations;
CREATE POLICY organizations_update_insiders ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR public.has_org_role('org_officer', id)
      OR public.has_org_role('org_adviser', id)
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR public.has_org_role('org_officer', id)
      OR public.has_org_role('org_adviser', id)
    )
  );
