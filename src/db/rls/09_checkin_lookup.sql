-- ===========================================================================
-- Hiraya — "has this learner already been scanned in?" (D-08, R6, FR-4.5)
--
-- The second narrow bridge on the check-in path, and it exists for the same
-- reason as the first (06_checkin_xp.sql): the officer at the gate needs one
-- fact out of a table they must not be able to read.
--
-- `checkins_select_self_or_hosts` admits a session to the attendance rows it
-- wrote itself, plus the hosting org's officers and advisers, plus the school's
-- advisers and admins. It deliberately does **not** admit `sslg_officer`
-- school-wide, because that role is held by learners and school-wide attendance
-- plus the roster every learner can already read is the non-participant list
-- (docs/SYSTEM_DESIGN.md §2, docs/DATA_FLOW.md T8). The reasoning is in the
-- header of checkins.sql.
--
-- But the scanner still has to distinguish a first scan from a second one. A
-- learner checked in at gate A and presented at gate B must be told "already
-- checked in", not "accepted" beside an award of zero — the second message is
-- how an officer learns to distrust the scanner. Without this function that
-- distinction is only available to a session that can read the row, so the two
-- gates would behave differently depending on who was holding which phone.
--
-- What keeps it safe is what it refuses to be asked. It answers **one** yes/no
-- about **one** (event, learner, direction) that the caller already names, to a
-- session that could have written that row itself. It cannot be aimed at a
-- list, cannot be asked "who attended", and returns no attendance detail — not
-- the scan time, not the device, not the officer. The non-participant
-- derivation needs the set; this hands back a single id.
--
-- It re-states the check-in INSERT policy for the same reason award_checkin_xp
-- does: SECURITY DEFINER sees past RLS, so the authority to write attendance
-- for this event has to be checked here too, or any session could interrogate
-- any event one learner at a time.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.find_existing_checkin(
  target_event     uuid,
  target_profile   uuid,
  target_direction public.checkin_direction
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_school uuid := public.current_school_id();
  v_event  public.events%ROWTYPE;
  v_id     uuid;
BEGIN
  IF v_school IS NULL THEN
    RAISE EXCEPTION 'find_existing_checkin: no session claims in force.'
      USING ERRCODE = '42501';
  END IF;

  -- Tenancy first, and read from the row rather than trusted from the argument
  -- (R1). An event of another school is not found, which is the same answer an
  -- event that does not exist gets (src/lib/errors.ts).
  SELECT * INTO v_event
  FROM public.events e
  WHERE e.id = target_event AND e.school_id = v_school;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'find_existing_checkin: no such event in this school.'
      USING ERRCODE = '42501';
  END IF;

  -- The check-in INSERT policy, re-stated (src/db/rls/checkins.sql). A session
  -- that could not write attendance for this event has no business asking who
  -- already has it.
  IF NOT (
    public.is_school_admin()
    OR public.has_any_role(ARRAY['sslg_officer', 'sslg_adviser'])
    OR public.has_org_role('org_officer', v_event.org_id)
    OR public.has_org_role('org_adviser', v_event.org_id)
  ) THEN
    RAISE EXCEPTION 'find_existing_checkin: not an officer or adviser of the hosting organization.'
      USING ERRCODE = '42501';
  END IF;

  -- The earliest, matching selectExistingCheckin: a duplicate result cites the
  -- check-in the learner already had, not the one that was just refused.
  SELECT c.id INTO v_id
  FROM public.checkins c
  WHERE c.school_id = v_school
    AND c.event_id = target_event
    AND c.profile_id = target_profile
    AND c.direction = target_direction
  ORDER BY c.scanned_at ASC
  LIMIT 1;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.find_existing_checkin(uuid, uuid, public.checkin_direction) IS
  'Whether one named learner already has attendance for one named event, for a session that may write it (D-08). Returns the earliest matching check-in id, or NULL. Deliberately answers about one learner at a time: school-wide attendance plus the roster is the non-participant list.';

REVOKE ALL ON FUNCTION public.find_existing_checkin(uuid, uuid, public.checkin_direction)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_existing_checkin(uuid, uuid, public.checkin_direction)
  TO authenticated;
