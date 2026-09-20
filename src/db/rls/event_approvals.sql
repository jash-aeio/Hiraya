-- event_approvals — the decision trail, including the required rejection reason.
-- Readable by the officers who submitted and the staff who decide; never
-- modified after the fact, so that "who approved this" stays answerable.
ALTER TABLE public.event_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_approvals FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.event_approvals FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.event_approvals TO authenticated;

DROP POLICY IF EXISTS event_approvals_select_insiders ON public.event_approvals;
CREATE POLICY event_approvals_select_insiders ON public.event_approvals
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR public.has_any_role(ARRAY['sslg_adviser', 'school_head'])
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

DROP POLICY IF EXISTS event_approvals_insert_approvers ON public.event_approvals;
CREATE POLICY event_approvals_insert_approvers ON public.event_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR public.has_role('sslg_adviser')
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id
          AND (
            public.has_org_role('org_adviser', e.org_id)
            -- An officer may create the pending row on submit; only an approver
            -- may fill in a decision, which the service enforces.
            OR public.has_org_role('org_officer', e.org_id)
          )
      )
    )
  );

DROP POLICY IF EXISTS event_approvals_update_approvers ON public.event_approvals;
CREATE POLICY event_approvals_update_approvers ON public.event_approvals
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR public.has_role('sslg_adviser')
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND public.has_org_role('org_adviser', e.org_id)
      )
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR public.has_role('sslg_adviser')
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND public.has_org_role('org_adviser', e.org_id)
      )
    )
  );
