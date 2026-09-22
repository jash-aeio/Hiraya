-- ===========================================================================
-- Hiraya — attendance XP (D18, D-02, FR-4.9, FR-5.1)
--
-- This is the function `src/db/rls/xp_ledger.sql` promises:
--
--   "Check-in-sourced XP does NOT come through here. It is written inside the
--    same transaction as the check-in by a SECURITY DEFINER function that
--    verifies the citing checkin row exists."
--
-- The reason is the one the whole product rests on. An officer at the gate must
-- be able to turn a scan into a point, and must **not** hold a general "award
-- XP" capability — otherwise a scanner device is an XP faucet, and the claim
-- that a point means a teacher confirmed you were there becomes unenforceable
-- (threat T2). So the ledger's INSERT policy admits only School Admin and the
-- SSLG adviser, an officer's session has no INSERT path at all, and this
-- function is the single narrow bridge: it awards for **one check-in row that
-- already exists**, at the value the school's own `xp_rules` sets, and it can
-- be aimed at nothing else.
--
-- Three properties make that true, and each is load-bearing:
--
--   1. It takes a check-in id, not a profile and an amount. The learner, the
--      event, the school and the timestamp are all read from the row.
--   2. It re-states the check-in INSERT policy before awarding. SECURITY
--      DEFINER sees past RLS, so the authority to write attendance for this
--      event is checked here too — otherwise any session could call it for a
--      check-in it could never have created.
--   3. It awards **at most once per learner per event**, under the event row
--      lock, so two officers scanning the same learner at two gates in the same
--      second produce two attendance rows and one award.
--
-- What it deliberately does not do: nothing here deletes, updates or reverses.
-- The ledger has no UPDATE or DELETE grant for any role (R4), and corrections
-- are reversal rows written by an adviser through the ordinary policy.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.award_checkin_xp(target_checkin uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_school  uuid := public.current_school_id();
  v_checkin public.checkins%ROWTYPE;
  v_event   public.events%ROWTYPE;
  v_xp      integer;
  v_season  uuid;
BEGIN
  IF v_school IS NULL THEN
    RAISE EXCEPTION 'award_checkin_xp: no session claims in force.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_checkin
  FROM public.checkins c
  WHERE c.id = target_checkin
    AND c.school_id = v_school;

  IF NOT FOUND THEN
    -- Includes a check-in in another school, which is not distinguishable from
    -- one that does not exist, and must not be.
    RAISE EXCEPTION 'award_checkin_xp: no such check-in in this school.'
      USING ERRCODE = '42501';
  END IF;

  -- The same lock register_for_event takes, and for a comparable reason: the
  -- "has this learner already been awarded for this event" check below is a
  -- read followed by a write, and two simultaneous scans of the same learner
  -- would otherwise both find nothing and both award.
  SELECT * INTO v_event
  FROM public.events e
  WHERE e.id = v_checkin.event_id
  FOR UPDATE;

  -- The check-in INSERT policy, re-stated (src/db/rls/checkins.sql). A session
  -- that could not have written this attendance row cannot turn it into points.
  IF NOT (
    public.is_school_admin()
    OR public.has_any_role(ARRAY['sslg_officer', 'sslg_adviser'])
    OR public.has_org_role('org_officer', v_event.org_id)
    OR public.has_org_role('org_adviser', v_event.org_id)
  ) THEN
    RAISE EXCEPTION 'award_checkin_xp: not an officer or adviser of the hosting organization.'
      USING ERRCODE = '42501';
  END IF;

  -- One award per learner per event, however many times they are scanned.
  --
  -- The unique constraint on checkins is (event_id, profile_id, jti), which
  -- makes a *replayed* scan a no-op (R6) but deliberately still admits a second
  -- genuine scan at a second gate — attendance is a record of what happened, so
  -- both rows are kept. The anti-farming rule lives here instead: the second
  -- row cites the same event, finds this award, and is worth nothing.
  --
  -- A reversed award still counts as awarded. Re-scanning a learner whose
  -- points an adviser deliberately reversed must not quietly restore them.
  IF EXISTS (
    SELECT 1
    FROM public.xp_ledger l
    JOIN public.checkins c ON c.id = l.source_id
    WHERE l.source_type = 'checkin'
      AND l.school_id = v_school
      AND l.profile_id = v_checkin.profile_id
      AND c.event_id = v_checkin.event_id
  ) THEN
    RETURN 0;
  END IF;

  -- The value in force **when the scan happened**, not the value today.
  -- xp_rules is versioned rather than edited (no UPDATE grant), so a past award
  -- can always be explained by the rule that was in force when it was made.
  SELECT r.xp_value INTO v_xp
  FROM public.xp_rules r
  WHERE r.school_id = v_school
    AND r.participation_type = 'attend_event'
    AND r.effective_from <= v_checkin.scanned_at
  ORDER BY r.effective_from DESC
  LIMIT 1;

  -- A school that has set no point value for attendance awards nothing, and the
  -- check-in still stands. A zero-delta row would add a line to every learner's
  -- history that says nothing happened.
  IF v_xp IS NULL OR v_xp = 0 THEN
    RETURN 0;
  END IF;

  -- The season the scan falls in; failing that, the current one. An award
  -- between seasons belongs to the current season rather than to none — a null
  -- season_id disappears from every seasonal board without ever being wrong
  -- enough to notice (the same rule scripts/seed-demo.ts applies).
  SELECT s.id INTO v_season
  FROM public.seasons s
  WHERE s.school_id = v_school
    AND v_checkin.scanned_at::date BETWEEN s.starts_on AND s.ends_on
  ORDER BY s.starts_on DESC
  LIMIT 1;

  IF v_season IS NULL THEN
    SELECT s.id INTO v_season
    FROM public.seasons s
    WHERE s.school_id = v_school
      AND s.is_current
    ORDER BY s.starts_on DESC
    LIMIT 1;
  END IF;

  -- `awarded_by` stays NULL: this award was made by the school's rule, not by a
  -- person's decision. The adviser paths that do carry a decision
  -- (manual_adjustment, dispute_resolution) fill it, and are audited for
  -- exactly that difference.
  INSERT INTO public.xp_ledger
    (school_id, profile_id, season_id, delta, participation_type, source_type, source_id, awarded_by)
  VALUES
    (v_school, v_checkin.profile_id, v_season, v_xp, 'attend_event', 'checkin', target_checkin, NULL);

  RETURN v_xp;
END;
$$;

COMMENT ON FUNCTION public.award_checkin_xp(uuid) IS
  'Writes the xp_ledger row for one existing check-in, at most once per learner per event (D18). An officer session holds no other INSERT path into the ledger.';

REVOKE ALL ON FUNCTION public.award_checkin_xp(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_checkin_xp(uuid) TO authenticated;
