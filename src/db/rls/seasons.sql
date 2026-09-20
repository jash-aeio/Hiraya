-- seasons — quarterly leaderboard resets. School-wide readable; School Admin
-- and the SSLG adviser open and close them.
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.seasons FROM anon, authenticated;
-- No DELETE grant: ledger rows cite a season, so deleting one would orphan the
-- explanation of when a point was earned.
GRANT SELECT, INSERT, UPDATE ON public.seasons TO authenticated;

DROP POLICY IF EXISTS seasons_select_tenant ON public.seasons;
CREATE POLICY seasons_select_tenant ON public.seasons
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS seasons_insert_point_setters ON public.seasons;
CREATE POLICY seasons_insert_point_setters ON public.seasons
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (public.is_school_admin() OR public.has_role('sslg_adviser'))
  );

DROP POLICY IF EXISTS seasons_update_point_setters ON public.seasons;
CREATE POLICY seasons_update_point_setters ON public.seasons
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (public.is_school_admin() OR public.has_role('sslg_adviser'))
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (public.is_school_admin() OR public.has_role('sslg_adviser'))
  );
