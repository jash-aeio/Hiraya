-- devices — push targets and the scanner registry. A push token identifies a
-- person's phone, so a learner sees only their own rows.
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.devices FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;

DROP POLICY IF EXISTS devices_select_self_or_admin ON public.devices;
CREATE POLICY devices_select_self_or_admin ON public.devices
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (profile_id = public.current_profile_id() OR public.is_school_admin())
  );

DROP POLICY IF EXISTS devices_insert_self ON public.devices;
CREATE POLICY devices_insert_self ON public.devices
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND profile_id = public.current_profile_id()
  );

DROP POLICY IF EXISTS devices_update_self_or_admin ON public.devices;
CREATE POLICY devices_update_self_or_admin ON public.devices
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (profile_id = public.current_profile_id() OR public.is_school_admin())
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (profile_id = public.current_profile_id() OR public.is_school_admin())
  );

-- Signing out of a device must actually remove its push token.
DROP POLICY IF EXISTS devices_delete_self_or_admin ON public.devices;
CREATE POLICY devices_delete_self_or_admin ON public.devices
  FOR DELETE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (profile_id = public.current_profile_id() OR public.is_school_admin())
  );
