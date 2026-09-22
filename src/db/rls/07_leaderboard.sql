-- ===========================================================================
-- Hiraya — the leaderboard (D-04, FR-5.6, FR-5.8)
--
-- A board is a *publication*: it takes rows a learner cannot read and turns
-- some of them into a ranked list everyone can. That is a deliberate product
-- decision, not a leak, and this file is where it is made — in one place, in
-- SQL, next to the data.
--
-- Why it cannot be a query in a service: `xp_ledger`'s SELECT policy shows a
-- learner their own rows and nobody else's, so a learner's session genuinely
-- cannot sum the school. Something has to read above that policy. Doing it in
-- a SECURITY DEFINER function rather than through the service role means the
-- publication rules — who is in scope, who is hidden, what is exposed about
-- them — are enforced by the function itself and cannot be widened by a caller.
--
-- What leaves here, and why it is allowed to: a display name, an avatar, a
-- grade, a section, a rank and a point total. Grade and section are on every
-- roster pinned to a classroom wall, and a school-wide board is unreadable
-- without them ("which Ana?"). What does not leave: anything that is not
-- already on a `profiles` row a schoolmate may read. The LRN is not here and is
-- not on `profiles` at all (CLAUDE.md §6).
--
-- Two rules from FR-5.8 are expressed as SQL rather than left to a screen:
--
--   1. **A hidden learner is absent from the rows and still sees their own
--      rank.** If hiding were a rendering decision, the hidden learner's rank
--      would sit in the payload of every client that asked for the board.
--   2. **Ranks are computed over the *visible* population.** Ranking over
--      everyone and then dropping the hidden rows would leave a gap at their
--      position — which tells the whole school that somebody is hidden there,
--      and roughly how many points they have.
--
-- Phase 4 replaces the computation with `leaderboard_snapshots` (D-04 in
-- docs/WORKSTREAMS.md). The response shape does not change, which is the point
-- of settling it now: that move is a query change, not a contract change.
-- ===========================================================================

DROP FUNCTION IF EXISTS public.leaderboard(text, text, uuid, integer);

-- ---------------------------------------------------------------------------
-- One call returns both halves of a board: the ranked rows, and the caller's
-- own standing, tagged by `l_kind`.
--
-- They come from one function rather than two so that the scope predicate, the
-- season filter and the ranking are written once. Two functions would have to
-- agree, and the day they stopped agreeing a learner would be shown a rank that
-- does not exist on the board they are looking at.
--
-- `target_ref` is honoured for `org` only. For `section` and `grade` the scope
-- is read from the caller's own profile and the argument is ignored: a learner
-- asking for another section's board is asking a question the product does not
-- pose (features/leaderboard/schema.ts), and a staff-facing cross-section view
-- is Phase 4 analytics with its own audit rules.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leaderboard(
  target_scope text,
  target_ref text DEFAULT NULL,
  target_season uuid DEFAULT NULL,
  row_limit integer DEFAULT 20
)
RETURNS TABLE (
  l_kind text,
  l_rank integer,
  l_profile_id uuid,
  l_display_name text,
  l_avatar_key text,
  l_grade_level integer,
  l_section text,
  l_xp integer,
  l_level_title text,
  l_hidden boolean,
  l_season_id uuid,
  l_season_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_school  uuid := public.current_school_id();
  v_profile uuid := public.current_profile_id();
  v_me      public.profiles%ROWTYPE;
  v_season  uuid;
  v_name    text;
  v_org     uuid;
BEGIN
  -- Fail closed, and silently: no claims, no board.
  IF v_school IS NULL OR v_profile IS NULL THEN
    RETURN;
  END IF;

  IF target_scope NOT IN ('school', 'grade', 'section', 'org') THEN
    RAISE EXCEPTION 'leaderboard: unknown scope %.', target_scope
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_me
  FROM public.profiles p
  WHERE p.id = v_profile
    AND p.school_id = v_school;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- A season id from another school names nothing here, and answers with an
  -- empty board rather than with that school's season.
  IF target_season IS NOT NULL THEN
    SELECT s.id, s.name INTO v_season, v_name
    FROM public.seasons s
    WHERE s.id = target_season
      AND s.school_id = v_school;
    IF NOT FOUND THEN
      RETURN;
    END IF;
  ELSE
    SELECT s.id, s.name INTO v_season, v_name
    FROM public.seasons s
    WHERE s.school_id = v_school
      AND s.is_current
    ORDER BY s.starts_on DESC
    LIMIT 1;
  END IF;

  IF target_scope = 'org' THEN
    IF target_ref IS NULL THEN
      RETURN;
    END IF;
    BEGIN
      v_org := target_ref::uuid;
    EXCEPTION WHEN others THEN
      -- Not a uuid: an empty board, not an error. A malformed scope reference
      -- is a client bug, and the shape of the answer should not depend on it.
      RETURN;
    END;
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT p.id, p.display_name, p.avatar_key, p.grade_level, p.section,
           p.hidden_from_boards
    FROM public.profiles p
    WHERE p.school_id = v_school
      AND p.status = 'active'
      AND (
        target_scope = 'school'
        -- NOT DISTINCT FROM, so a learner with no section is scoped with the
        -- others who have none rather than matching everyone.
        OR (target_scope = 'grade' AND p.grade_level IS NOT DISTINCT FROM v_me.grade_level)
        OR (target_scope = 'section' AND p.section IS NOT DISTINCT FROM v_me.section)
        OR (target_scope = 'org' AND EXISTS (
              SELECT 1 FROM public.org_memberships m
              WHERE m.profile_id = p.id
                AND m.org_id = v_org
                AND m.school_id = v_school
                AND m.status = 'active'
            ))
      )
  ),
  totals AS (
    SELECT s.id, s.display_name, s.avatar_key, s.grade_level, s.section,
           s.hidden_from_boards,
           -- Reversal rows carry a negative delta, so a corrected total is the
           -- ledger working as designed (R4) rather than history being edited.
           COALESCE(SUM(l.delta), 0)::integer AS xp
    FROM scoped s
    LEFT JOIN public.xp_ledger l
      ON l.profile_id = s.id
     AND l.school_id = v_school
     AND (v_season IS NULL OR l.season_id = v_season)
    GROUP BY s.id, s.display_name, s.avatar_key, s.grade_level, s.section,
             s.hidden_from_boards
  ),
  -- Nobody appears on a board for having done nothing. A school-wide list of
  -- five hundred zeros is not a leaderboard, it is a roster.
  earners AS (
    SELECT * FROM totals WHERE xp > 0
  ),
  visible AS (
    SELECT e.*, rank() OVER (ORDER BY e.xp DESC)::integer AS rnk
    FROM earners e
    WHERE NOT e.hidden_from_boards
  ),
  me AS (
    SELECT t.id, t.xp, t.hidden_from_boards
    FROM totals t
    WHERE t.id = v_profile
  )
  SELECT * FROM (
    SELECT
      'row'::text,
      v.rnk,
      v.id,
      v.display_name,
      v.avatar_key,
      v.grade_level,
      v.section,
      v.xp,
      lv.title,
      false,
      v_season,
      v_name
    FROM visible v
    LEFT JOIN LATERAL (
      SELECT l2.title
      FROM public.levels l2
      WHERE l2.school_id = v_school
        AND l2.threshold_xp <= v.xp
      ORDER BY l2.threshold_xp DESC, l2.level_number DESC
      LIMIT 1
    ) lv ON true
    ORDER BY v.rnk, v.display_name
    LIMIT GREATEST(row_limit, 0)
  ) AS rows_out

  UNION ALL

  SELECT
    'viewer'::text,
    -- The rank this learner would hold among the visible ones. For a learner
    -- who is on the board this is exactly their row's rank; for a hidden
    -- learner it is the rank they would have, which FR-5.8 promises them and
    -- which no other client can see.
    CASE
      WHEN m.xp > 0
        THEN ((SELECT count(*) FROM visible v2 WHERE v2.xp > m.xp) + 1)::integer
      ELSE NULL
    END,
    m.id,
    v_me.display_name,
    v_me.avatar_key,
    v_me.grade_level,
    v_me.section,
    m.xp,
    (
      SELECT l3.title
      FROM public.levels l3
      WHERE l3.school_id = v_school
        AND l3.threshold_xp <= m.xp
      ORDER BY l3.threshold_xp DESC, l3.level_number DESC
      LIMIT 1
    ),
    m.hidden_from_boards,
    v_season,
    v_name
  FROM me m;
END;
$$;

COMMENT ON FUNCTION public.leaderboard(text, text, uuid, integer) IS
  'Ranked board plus the caller own standing, for one scope and season (D-04). Hidden learners are absent from the rows and ranks are computed over the visible population, so a gap never announces one (FR-5.8).';

REVOKE ALL ON FUNCTION public.leaderboard(text, text, uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard(text, text, uuid, integer) TO authenticated;
