-- checkins — the row that makes "a point means a teacher confirmed you were
-- there" true. Everything else in Hiraya is downstream of this file.
--
-- A learner has no INSERT path. Attendance is written only by the officers and
-- advisers running the event, which is the whole of the verification claim
-- (CLAUDE.md §1). A colluding officer remains possible (threat T2) and is
-- detected by ledger auditing, not prevented here.
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.checkins FROM anon, authenticated;
-- No DELETE grant, for anyone: attendance is a record of something that
-- happened. A wrong scan is corrected by an audited adviser action, not erased.
GRANT SELECT, INSERT, UPDATE ON public.checkins TO authenticated;

-- The role list below must stay a superset of the one in the INSERT policy.
--
-- It did not, and the gap was a 500 at the gate: `sslg_officer` could write
-- attendance and could not read it, so the `RETURNING id` on the insert in
-- src/features/checkin/queries.ts died as "new row violates row-level security
-- policy" — Postgres applies the SELECT policy to a row an INSERT returns. The
-- role is school-wide without being an adviser or an admin, which is exactly
-- who staffs a school-wide event, and every walk of the loop until 2026-09-25
-- had used an org officer of the hosting org instead.
--
-- Admitting them widens who may read attendance, and that is a real privacy
-- decision rather than a mechanical fix: an SSLG officer is a learner. It is a
-- small widening of a read the schema already grants, not a new one —
-- xp_ledger_select_self_or_staff admits the same role to every learner's ledger
-- school-wide, and each row there cites the check-in behind it. What is added
-- is the scan metadata: when, at which gate, on whose device.
DROP POLICY IF EXISTS checkins_select_self_or_hosts ON public.checkins;
CREATE POLICY checkins_select_self_or_hosts ON public.checkins
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      profile_id = public.current_profile_id()
      OR public.is_school_admin()
      OR public.has_any_role(ARRAY['sslg_officer', 'sslg_adviser', 'school_head'])
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

DROP POLICY IF EXISTS checkins_insert_hosts ON public.checkins;
CREATE POLICY checkins_insert_hosts ON public.checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR public.has_any_role(ARRAY['sslg_officer', 'sslg_adviser'])
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

-- UPDATE exists for one purpose: an adviser resolving a scan the server flagged
-- as outside the event window. Officers and learners are not admitted.
DROP POLICY IF EXISTS checkins_update_advisers ON public.checkins;
CREATE POLICY checkins_update_advisers ON public.checkins
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
