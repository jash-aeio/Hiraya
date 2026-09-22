-- ===========================================================================
-- Hiraya — registration and the waitlist (D-01, FR-3.3, US-2)
--
-- Two functions, and they exist for one reason: **capacity is a race, and a
-- race cannot be settled in a service.**
--
-- The naive shape is `SELECT count(*)` in TypeScript, compare to capacity, then
-- INSERT. Two learners tapping Register on the last seat both read 19, both
-- insert, and an event capped at 20 has 21 registrations. No amount of care in
-- `service.ts` fixes that; only the database can, because only the database can
-- hold a lock across the read and the write.
--
-- So the count and the insert happen inside one function, after `SELECT ... FOR
-- UPDATE` on the event row. Every registration for a given event serializes
-- behind that lock. It is the boring answer and it is the correct one.
--
-- Why SECURITY DEFINER, when CLAUDE.md R1 says tenancy is the database's job
-- and R2 says elevated access is almost always the wrong answer:
--
--   A learner's own policy on `event_registrations` shows them their own row
--   and nobody else's (src/db/rls/event_registrations.sql). That is the right
--   policy — a fill count is not a learner's business (features/events/schema.ts
--   says so, and deliberately publishes no "spots left"). But it means a
--   learner's session genuinely cannot count the roster, so the capacity check
--   has to run above their policy.
--
-- What that costs, stated plainly: these functions see past RLS, so every rule
-- the policies would have enforced is re-stated here in SQL, next to the data.
-- Specifically — the tenant is `current_school_id()` and never an argument; the
-- profile is `current_profile_id()` and never an argument, so a caller cannot
-- register somebody else; and the event must be one the caller could already
-- see under `events_select_published_or_insiders`. A caller names an event id
-- and a yes/no. Nothing else.
--
-- These two are what `docs/WORKSTREAMS.md` D-01 means by "settle it in SQL, not
-- in the service".
-- ===========================================================================

-- `RETURNS TABLE` is part of the signature, so CREATE OR REPLACE cannot change
-- the column list. Dropped first for the same reason as 02_demo_session.sql:
-- nothing depends on them, and the grants are re-issued at the foot of the file.
DROP FUNCTION IF EXISTS public.register_for_event(uuid, boolean);
DROP FUNCTION IF EXISTS public.cancel_event_registration(uuid);

-- ---------------------------------------------------------------------------
-- Register the calling learner for an event.
--
-- Returns exactly one row. `r_outcome` is the whole vocabulary:
--
--   registered     — holds a seat (idempotent: an existing seat returns this)
--   waitlisted     — holds a waitlist place, `r_waitlist_position` is 1-based
--   event_full     — refused, and `r_detail` carries the offer (US-2)
--   not_eligible   — refused, and `r_detail` names the criterion
--   not_found      — no such event, another school's event, or an unpublished one
--
-- The function returns an outcome rather than raising, because four of these
-- five are ordinary product answers a screen renders, not faults. The service
-- turns each into the error code src/lib/errors.ts already defines, and only
-- the service knows about HTTP.
--
-- Output columns are prefixed `r_` so that no column reference inside the body
-- is ambiguous against an OUT parameter — plpgsql resolves that silently and
-- wrongly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_for_event(
  target_event uuid,
  accept_waitlist boolean DEFAULT false
)
RETURNS TABLE (
  r_outcome text,
  r_status public.registration_status,
  r_waitlist_position integer,
  r_registered_at timestamptz,
  r_detail jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_school     uuid := public.current_school_id();
  v_profile    uuid := public.current_profile_id();
  v_event      public.events%ROWTYPE;
  v_me         public.profiles%ROWTYPE;
  v_rule       jsonb;
  v_grades     jsonb;
  v_sections   jsonb;
  v_orgs       jsonb;
  v_existing   public.event_registrations%ROWTYPE;
  v_taken      integer;
  v_position   integer;
  v_status     public.registration_status;
  v_row        public.event_registrations%ROWTYPE;
BEGIN
  -- Fail closed. No claims means no session, and a session is the only thing
  -- that says who is registering.
  IF v_school IS NULL OR v_profile IS NULL THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::public.registration_status,
                        NULL::integer, NULL::timestamptz, '{}'::jsonb;
    RETURN;
  END IF;

  -- The lock that makes capacity correct. Taken before anything is read about
  -- the roster, and held to the end of the transaction, so a concurrent
  -- register or cancel on the same event waits here rather than racing.
  SELECT * INTO v_event
  FROM public.events e
  WHERE e.id = target_event
    AND e.school_id = v_school
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::public.registration_status,
                        NULL::integer, NULL::timestamptz, '{}'::jsonb;
    RETURN;
  END IF;

  -- The published-to-the-school half of events_select_published_or_insiders.
  -- An event a learner could not have seen answers the same way a nonexistent
  -- one does, for the reason src/lib/errors.ts gives for NOT_FOUND: any other
  -- answer confirms that the row exists.
  IF v_event.publish_at IS NULL
     OR v_event.status NOT IN ('approved', 'completed', 'cancelled') THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::public.registration_status,
                        NULL::integer, NULL::timestamptz, '{}'::jsonb;
    RETURN;
  END IF;

  -- Two timing refusals, and they are different facts. `event_not_open` is
  -- about the event's standing — cancelled, or already marked completed.
  -- `registration_closed` is about the clock.
  IF v_event.status <> 'approved' THEN
    RETURN QUERY SELECT 'not_eligible'::text, NULL::public.registration_status,
                        NULL::integer, NULL::timestamptz,
                        jsonb_build_object('criterion', 'event_not_open');
    RETURN;
  END IF;

  IF v_event.ends_at <= now() THEN
    RETURN QUERY SELECT 'not_eligible'::text, NULL::public.registration_status,
                        NULL::integer, NULL::timestamptz,
                        jsonb_build_object('criterion', 'registration_closed');
    RETURN;
  END IF;

  SELECT * INTO v_me FROM public.profiles p WHERE p.id = v_profile;

  -- Eligibility: the event's own published rule (events.eligibility_json),
  -- checked in the order the contract lists the criteria. One criterion is
  -- returned, not all of them — enumerating the rest invites a learner to
  -- reverse-engineer a roster (features/registration/schema.ts).
  v_rule := COALESCE(v_event.eligibility_json, '{}'::jsonb);

  -- A rule that is not an object is a data fault, not a product answer, and the
  -- honest thing to do with it is stop. `jsonb` will accept a bare string in
  -- this column — a caller that double-encodes its JSON produces one — and the
  -- typeof guards below would then read every rule as absent and admit the
  -- whole school to an event restricted to two grade levels. Failing open on an
  -- eligibility rule is not a failure mode worth having; the service maps this
  -- to INTERNAL, which is what it is.
  IF jsonb_typeof(v_rule) <> 'object' THEN
    RAISE EXCEPTION
      'eligibility_malformed: events.eligibility_json on % is %, not an object.',
      target_event, jsonb_typeof(v_rule)
      USING ERRCODE = '22023';
  END IF;

  v_grades   := v_rule -> 'gradeLevels';
  v_sections := v_rule -> 'sections';
  v_orgs     := v_rule -> 'orgIds';

  IF jsonb_typeof(v_grades) = 'array' AND jsonb_array_length(v_grades) > 0 THEN
    IF v_me.grade_level IS NULL OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_grades) AS g(value)
      WHERE g.value = v_me.grade_level::text
    ) THEN
      -- The payload carries the *event's* rule, never the caller's own grade
      -- read back to them. A fact about the event is not the section-PII R8
      -- keeps out of responses.
      RETURN QUERY SELECT 'not_eligible'::text, NULL::public.registration_status,
                          NULL::integer, NULL::timestamptz,
                          jsonb_build_object('criterion', 'grade_level',
                                             'allowedGradeLevels', v_grades);
      RETURN;
    END IF;
  END IF;

  IF jsonb_typeof(v_sections) = 'array' AND jsonb_array_length(v_sections) > 0 THEN
    IF v_me.section IS NULL OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_sections) AS s(value)
      WHERE s.value = v_me.section
    ) THEN
      RETURN QUERY SELECT 'not_eligible'::text, NULL::public.registration_status,
                          NULL::integer, NULL::timestamptz,
                          jsonb_build_object('criterion', 'section',
                                             'allowedSections', v_sections);
      RETURN;
    END IF;
  END IF;

  IF jsonb_typeof(v_orgs) = 'array' AND jsonb_array_length(v_orgs) > 0 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(v_orgs) AS o(value)
      JOIN public.org_memberships m
        ON m.org_id = o.value::uuid
       AND m.profile_id = v_profile
       AND m.status = 'active'
    ) THEN
      RETURN QUERY SELECT 'not_eligible'::text, NULL::public.registration_status,
                          NULL::integer, NULL::timestamptz,
                          jsonb_build_object('criterion', 'org_membership',
                                             'orgId', v_orgs -> 0);
      RETURN;
    END IF;
  END IF;

  -- An existing seat or waitlist place is returned unchanged. Registering twice
  -- is not an error and must not renumber anyone: a retry after a flaky
  -- connection is the common case, not a mistake (the same reasoning as R6).
  SELECT * INTO v_existing
  FROM public.event_registrations r
  WHERE r.event_id = target_event
    AND r.profile_id = v_profile
  FOR UPDATE;

  IF FOUND AND v_existing.status <> 'cancelled' THEN
    RETURN QUERY SELECT v_existing.status::text, v_existing.status,
                        v_existing.waitlist_position, v_existing.registered_at,
                        '{}'::jsonb;
    RETURN;
  END IF;

  v_status   := 'registered';
  v_position := NULL;

  IF v_event.capacity IS NOT NULL THEN
    SELECT count(*) INTO v_taken
    FROM public.event_registrations r
    WHERE r.event_id = target_event
      AND r.status = 'registered';

    IF v_taken >= v_event.capacity THEN
      IF NOT accept_waitlist THEN
        -- A refusal with an offer, not a silent downgrade. A learner should
        -- never discover they hold a waitlist place by reading a badge later.
        --
        -- `waitlistAvailable` is true on every path that reaches here in Phase
        -- 0: the cases where a waitlist would be a lie — cancelled, completed,
        -- or past — are refused above with NOT_ELIGIBLE before capacity is ever
        -- counted. The field is in the contract because the refusal and the
        -- offer travel together, and a client should read the offer rather than
        -- infer it.
        RETURN QUERY SELECT 'event_full'::text, NULL::public.registration_status,
                            NULL::integer, NULL::timestamptz,
                            jsonb_build_object('capacity', v_event.capacity,
                                               'waitlistAvailable', true);
        RETURN;
      END IF;

      v_status := 'waitlisted';
      SELECT COALESCE(max(r.waitlist_position), 0) + 1 INTO v_position
      FROM public.event_registrations r
      WHERE r.event_id = target_event
        AND r.status = 'waitlisted';
    END IF;
  END IF;

  -- ON CONFLICT covers re-registering after a cancellation: the unique index
  -- (event_id, profile_id) means the cancelled row is the row, and there is no
  -- DELETE grant on this table by design, so it is updated rather than replaced.
  INSERT INTO public.event_registrations
    (school_id, event_id, profile_id, status, waitlist_position, registered_at, cancelled_at)
  VALUES
    (v_school, target_event, v_profile, v_status, v_position, now(), NULL)
  ON CONFLICT (event_id, profile_id) DO UPDATE
    SET status            = EXCLUDED.status,
        waitlist_position = EXCLUDED.waitlist_position,
        registered_at     = EXCLUDED.registered_at,
        cancelled_at      = NULL,
        updated_at        = now()
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.status::text, v_row.status, v_row.waitlist_position,
                      v_row.registered_at, '{}'::jsonb;
END;
$$;

COMMENT ON FUNCTION public.register_for_event(uuid, boolean) IS
  'Registers the calling profile for an event under the event row lock, so capacity cannot be overrun by concurrent requests (D-01). Tenant and profile come from the claims, never from an argument.';

-- ---------------------------------------------------------------------------
-- Cancel the calling learner's registration, and promote the waitlist.
--
-- Giving up a seat is the moment a waitlist place becomes a seat, and the two
-- have to happen together or the seat is lost until someone notices. So the
-- promotion is here, inside the same transaction and behind the same event
-- lock, rather than in a job or a service.
--
-- `r_promoted_profile_id` comes back so the caller can notify and log the
-- promotion. It is an id, which is what a log line may carry (CLAUDE.md R8).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_event_registration(target_event uuid)
RETURNS TABLE (
  r_outcome text,
  r_status public.registration_status,
  r_waitlist_position integer,
  r_registered_at timestamptz,
  r_promoted_profile_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_school   uuid := public.current_school_id();
  v_profile  uuid := public.current_profile_id();
  v_was      public.registration_status;
  v_row      public.event_registrations%ROWTYPE;
  v_id       uuid;
  v_promoted uuid;
BEGIN
  IF v_school IS NULL OR v_profile IS NULL THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::public.registration_status,
                        NULL::integer, NULL::timestamptz, NULL::uuid;
    RETURN;
  END IF;

  -- Same lock as register_for_event, so a cancellation and a registration on
  -- the same event can never interleave between the count and the write.
  PERFORM 1 FROM public.events e
   WHERE e.id = target_event AND e.school_id = v_school
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::public.registration_status,
                        NULL::integer, NULL::timestamptz, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.event_registrations r
  WHERE r.event_id = target_event
    AND r.profile_id = v_profile
  FOR UPDATE;

  IF NOT FOUND OR v_row.status = 'cancelled' THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::public.registration_status,
                        NULL::integer, NULL::timestamptz, NULL::uuid;
    RETURN;
  END IF;

  v_was := v_row.status;
  v_id  := v_row.id;

  UPDATE public.event_registrations r
     SET status = 'cancelled',
         waitlist_position = NULL,
         cancelled_at = now(),
         updated_at = now()
   WHERE r.id = v_id
  RETURNING * INTO v_row;

  -- One seat opened, so exactly one place is promoted. Ordered by position,
  -- with registered_at as the tie-break for rows written before positions were
  -- renumbered.
  IF v_was = 'registered' THEN
    UPDATE public.event_registrations r
       SET status = 'registered',
           waitlist_position = NULL,
           updated_at = now()
     WHERE r.id = (
       SELECT w.id FROM public.event_registrations w
        WHERE w.event_id = target_event
          AND w.status = 'waitlisted'
        ORDER BY w.waitlist_position NULLS LAST, w.registered_at
        LIMIT 1
     )
    RETURNING r.profile_id INTO v_promoted;
  END IF;

  -- Renumber whoever is left. Positions are what a learner is shown ("3rd on
  -- the waitlist"), so a gap left by a promotion or a cancellation would read
  -- as the queue not moving.
  WITH ordered AS (
    SELECT w.id,
           row_number() OVER (ORDER BY w.waitlist_position NULLS LAST, w.registered_at) AS pos
    FROM public.event_registrations w
    WHERE w.event_id = target_event
      AND w.status = 'waitlisted'
  )
  UPDATE public.event_registrations r
     SET waitlist_position = o.pos,
         updated_at = now()
  FROM ordered o
  WHERE r.id = o.id
    AND r.waitlist_position IS DISTINCT FROM o.pos::integer;

  RETURN QUERY SELECT 'cancelled'::text, v_row.status, v_row.waitlist_position,
                      v_row.registered_at, v_promoted;
END;
$$;

COMMENT ON FUNCTION public.cancel_event_registration(uuid) IS
  'Cancels the calling profile registration and promotes the head of the waitlist in the same transaction (D-01).';

-- ---------------------------------------------------------------------------
-- Who may call them.
--
-- Supabase grants EXECUTE on new functions in `public` to anon, authenticated
-- and service_role by default privilege, and scripts/bootstrap-roles.sql
-- mirrors that locally so these revokes are actually exercised by the suite. A
-- SECURITY DEFINER function left at its default grants is an RLS bypass
-- reachable by anyone who can reach the database.
--
-- `authenticated` only — the role src/lib/db/client.ts drops to. anon holds
-- nothing for the same reason it holds nothing on any table: without claims
-- both functions fail closed anyway, but a function anon cannot call is one
-- fewer thing depending on that.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.register_for_event(uuid, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.cancel_event_registration(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.register_for_event(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_event_registration(uuid) TO authenticated;
