-- org_memberships — applications and active membership. A learner applies for
-- themselves; the org's officers and adviser decide.
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_memberships FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.org_memberships FROM anon, authenticated;
-- No DELETE grant: leaving an org sets status inactive, which keeps the record
-- of having been a member for the Co-curricular Record.
GRANT SELECT, INSERT, UPDATE ON public.org_memberships TO authenticated;

DROP POLICY IF EXISTS org_memberships_select_self_or_insiders ON public.org_memberships;
CREATE POLICY org_memberships_select_self_or_insiders ON public.org_memberships
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      profile_id = public.current_profile_id()
      OR public.is_school_admin()
      OR public.has_org_role('org_officer', org_id)
      OR public.has_org_role('org_adviser', org_id)
    )
  );

DROP POLICY IF EXISTS org_memberships_insert_self_or_insiders ON public.org_memberships;
CREATE POLICY org_memberships_insert_self_or_insiders ON public.org_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      profile_id = public.current_profile_id()
      OR public.is_school_admin()
      OR public.has_org_role('org_officer', org_id)
      OR public.has_org_role('org_adviser', org_id)
    )
  );

DROP POLICY IF EXISTS org_memberships_update_self_or_insiders ON public.org_memberships;
CREATE POLICY org_memberships_update_self_or_insiders ON public.org_memberships
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      profile_id = public.current_profile_id()
      OR public.is_school_admin()
      OR public.has_org_role('org_officer', org_id)
      OR public.has_org_role('org_adviser', org_id)
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      profile_id = public.current_profile_id()
      OR public.is_school_admin()
      OR public.has_org_role('org_officer', org_id)
      OR public.has_org_role('org_adviser', org_id)
    )
  );
