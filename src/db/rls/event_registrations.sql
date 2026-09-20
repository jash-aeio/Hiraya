-- event_registrations — a learner registers for themselves; the hosting org's
-- officers see their own roster and nobody else's. Capacity and waitlist order
-- are decided by the service, which holds the transaction.
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.event_registrations FROM anon, authenticated;
-- No DELETE grant: cancelling sets status, so the waitlist history stays
-- reconstructible when a seat is promoted.
GRANT SELECT, INSERT, UPDATE ON public.event_registrations TO authenticated;

DROP POLICY IF EXISTS event_registrations_select_self_or_hosts ON public.event_registrations;
CREATE POLICY event_registrations_select_self_or_hosts ON public.event_registrations
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      profile_id = public.current_profile_id()
      OR public.is_school_admin()
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id
          AND (
            public.has_org_role('org_officer', e.org_id)
            OR public.has_org_role('org_adviser', e.org_id)
          )
      )
    )
  );

DROP POLICY IF EXISTS event_registrations_insert_self ON public.event_registrations;
CREATE POLICY event_registrations_insert_self ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (profile_id = public.current_profile_id() OR public.is_school_admin())
  );

DROP POLICY IF EXISTS event_registrations_update_self_or_hosts ON public.event_registrations;
CREATE POLICY event_registrations_update_self_or_hosts ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      profile_id = public.current_profile_id()
      OR public.is_school_admin()
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id
          AND (
            public.has_org_role('org_officer', e.org_id)
            OR public.has_org_role('org_adviser', e.org_id)
          )
      )
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      profile_id = public.current_profile_id()
      OR public.is_school_admin()
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id
          AND (
            public.has_org_role('org_officer', e.org_id)
            OR public.has_org_role('org_adviser', e.org_id)
          )
      )
    )
  );
