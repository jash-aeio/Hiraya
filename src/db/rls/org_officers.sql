-- org_officers — school-wide readable (an org profile lists its officers).
-- Appointments are made by the org's adviser or School Admin, never by the
-- officers themselves: otherwise an officer could extend their own term.
ALTER TABLE public.org_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_officers FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.org_officers FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_officers TO authenticated;

DROP POLICY IF EXISTS org_officers_select_tenant ON public.org_officers;
CREATE POLICY org_officers_select_tenant ON public.org_officers
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS org_officers_insert_adviser ON public.org_officers;
CREATE POLICY org_officers_insert_adviser ON public.org_officers
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (public.is_school_admin() OR public.has_org_role('org_adviser', org_id))
  );

DROP POLICY IF EXISTS org_officers_update_adviser ON public.org_officers;
CREATE POLICY org_officers_update_adviser ON public.org_officers
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (public.is_school_admin() OR public.has_org_role('org_adviser', org_id))
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (public.is_school_admin() OR public.has_org_role('org_adviser', org_id))
  );

DROP POLICY IF EXISTS org_officers_delete_adviser ON public.org_officers;
CREATE POLICY org_officers_delete_adviser ON public.org_officers
  FOR DELETE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (public.is_school_admin() OR public.has_org_role('org_adviser', org_id))
  );
