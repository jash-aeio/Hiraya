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

-- `recorded_by` is here because the INSERT policy admits a role this one must
-- not (D-08).
--
-- `checkins_insert_hosts` admits `sslg_officer` — the role that staffs a
-- school-wide event — and `insertCheckin` carries `RETURNING id`, which
-- Postgres runs through *this* policy. So an SSLG officer's scan died as "new
-- row violates row-level security policy" and reached the gate as a 500. It
-- survived four walks of the loop because each used an org officer of the
-- hosting org.
--
-- The obvious repair is to admit `sslg_officer` here too, and it is wrong. That
-- role is held by learners (seed/demo-people.json), and school-wide SELECT on
-- this table is the non-participant list: `profiles_select_tenant` already
-- gives every learner the whole roster, so roster minus this event's attendees
-- is the surface docs/SYSTEM_DESIGN.md §2 denies to SSLG Officer, denies even
-- to Guidance, and docs/DATA_FLOW.md T8 says is audited on every access — and a
-- raw SELECT satisfied by RLS is audited nowhere.
--
-- Nor is it a read the schema already grants elsewhere.
-- `xp_ledger_select_self_or_staff` does admit this role school-wide, but
-- `award_checkin_xp` writes `source_id` and leaves `reason` NULL, so without a
-- SELECT path into this table that id is opaque: the ledger says a learner
-- attended *something*, never which event. Per-event attendance is a new
-- capability, and it is precisely the one that completes the derivation.
--
-- So the grant is the narrowest thing that makes the write work: a session may
-- read the attendance rows it wrote itself. Nothing else changes. The officer's
-- other need — "has this learner already been scanned in?" — is answered by
-- public.find_existing_checkin (09_checkin_lookup.sql), a purpose-built bridge
-- past RLS rather than a blanket grant, which is the same shape as
-- award_checkin_xp and for the same reason.
DROP POLICY IF EXISTS checkins_select_self_or_hosts ON public.checkins;
CREATE POLICY checkins_select_self_or_hosts ON public.checkins
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      profile_id = public.current_profile_id()
      OR recorded_by = public.current_profile_id()
      OR public.is_school_admin()
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
