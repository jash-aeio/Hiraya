-- events — the rule "an event is invisible to learners until it is approved"
-- (docs/SYSTEM_DESIGN.md §3.1) is expressed here rather than in a query filter,
-- because a forgotten filter publishes an unapproved event to the whole school.
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.events FROM anon, authenticated;
-- No DELETE grant: events are cancelled, never deleted. Attendance and XP rows
-- cite them, and a point must always trace back to something that happened.
GRANT SELECT, INSERT, UPDATE ON public.events TO authenticated;

DROP POLICY IF EXISTS events_select_published_or_insiders ON public.events;
CREATE POLICY events_select_published_or_insiders ON public.events
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      -- Published to the school: approved at least once, and still on record.
      (publish_at IS NOT NULL AND status IN ('approved', 'completed', 'cancelled'))
      -- Or the people who run and supervise it, at any status.
      OR public.is_school_admin()
      OR public.has_any_role(ARRAY['sslg_officer', 'sslg_adviser', 'school_head'])
      OR public.has_org_role('org_officer', org_id)
      OR public.has_org_role('org_adviser', org_id)
    )
  );

DROP POLICY IF EXISTS events_insert_org_or_admin ON public.events;
CREATE POLICY events_insert_org_or_admin ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR public.has_role('sslg_officer')
      OR public.has_org_role('org_officer', org_id)
      OR public.has_org_role('org_adviser', org_id)
    )
  );

-- Approval is an UPDATE, so advisers appear here. Which status transitions are
-- legal, and the rule that an adviser cannot approve their own draft, live in
-- the service: RLS can bound who touches the row, not the shape of the change.
DROP POLICY IF EXISTS events_update_org_or_approvers ON public.events;
CREATE POLICY events_update_org_or_approvers ON public.events
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR public.has_role('sslg_adviser')
      OR public.has_org_role('org_officer', org_id)
      OR public.has_org_role('org_adviser', org_id)
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR public.has_role('sslg_adviser')
      OR public.has_org_role('org_officer', org_id)
      OR public.has_org_role('org_adviser', org_id)
    )
  );
