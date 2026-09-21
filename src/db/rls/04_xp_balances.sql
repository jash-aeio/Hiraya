-- ===========================================================================
-- xp_balances — the derived view the XP and profile screens read (D19).
--
-- A regular view declared `security_invoker = true`, never a materialized one.
-- A materialized view holds its own copy of the rows and cannot carry an RLS
-- policy, so one built over `xp_ledger` would be readable across schools by
-- anyone granted SELECT on it — the exact failure R1 exists to prevent. With
-- `security_invoker` the caller's own policies on xp_ledger, seasons and levels
-- still apply, so this view can see nothing its reader could not already see.
--
-- It lives here rather than in a Drizzle migration because that is what makes
-- it re-applied on every `db:migrate`: its security property is a single table
-- option, and a single option is exactly the kind of thing a hand-edited
-- migration loses on the day somebody rebuilds the database.
--
-- Balances are computed per read. Revisit with measurements, and never by
-- reaching for MATERIALIZED. Leaderboards do not read this view at all — they
-- read `leaderboard_snapshots`, which is why aggregating per request is
-- affordable here: this is one learner's own row, not a ranked school.
-- ===========================================================================

-- Dropped rather than CREATE OR REPLACE: replace refuses any change to the
-- column list, so a shape change would fail on every database that already has
-- the old view. Nothing is lost — a view stores no rows.
DROP VIEW IF EXISTS public.xp_balances;

CREATE VIEW public.xp_balances
WITH (security_invoker = true) AS
WITH current_season AS (
  -- DISTINCT ON, not a plain WHERE: nothing in the schema stops two seasons
  -- being flagged current at once, and a duplicate here would multiply every
  -- learner's ledger rows and double their XP. The newest wins.
  SELECT DISTINCT ON (s.school_id) s.school_id, s.id
  FROM public.seasons s
  WHERE s.is_current
  ORDER BY s.school_id, s.starts_on DESC
),
totals AS (
  SELECT
    l.school_id,
    l.profile_id,
    cs.id AS current_season_id,
    -- Reversal rows carry a negative delta, so SUM is the correction mechanism
    -- working as designed (R4): history is added to, never edited.
    COALESCE(SUM(l.delta), 0)::integer AS lifetime_xp,
    COALESCE(SUM(l.delta) FILTER (WHERE l.season_id = cs.id), 0)::integer AS season_xp
  FROM public.xp_ledger l
  LEFT JOIN current_season cs ON cs.school_id = l.school_id
  GROUP BY l.school_id, l.profile_id, cs.id
)
SELECT
  t.school_id,
  t.profile_id,
  t.current_season_id,
  t.lifetime_xp,
  t.season_xp,
  -- Level is driven by LIFETIME xp, not season xp. FR-5.1 says XP never
  -- decreases and drives levels; FR-5.5 resets the leaderboard each quarter.
  -- Tying the title to the season would demote every learner on the day a
  -- season opens, which is the one thing a title is supposed not to do.
  cur.level_number,
  cur.title AS level_title,
  cur.badge_key,
  cur.threshold_xp AS level_threshold_xp,
  -- NULL at the top level. The progress bar reads that as "maxed", not as 0.
  nxt.threshold_xp AS next_threshold_xp
FROM totals t
LEFT JOIN LATERAL (
  SELECT lv.level_number, lv.title, lv.badge_key, lv.threshold_xp
  FROM public.levels lv
  WHERE lv.school_id = t.school_id
    AND lv.threshold_xp <= t.lifetime_xp
  ORDER BY lv.threshold_xp DESC, lv.level_number DESC
  LIMIT 1
) cur ON true
LEFT JOIN LATERAL (
  SELECT lv.threshold_xp
  FROM public.levels lv
  WHERE lv.school_id = t.school_id
    AND lv.threshold_xp > t.lifetime_xp
  ORDER BY lv.threshold_xp ASC
  LIMIT 1
) nxt ON true;

COMMENT ON VIEW public.xp_balances IS
  'Derived XP totals and level per profile. security_invoker: the reader''s own xp_ledger policy decides which rows exist here (D19).';

-- A learner with no ledger rows has no row here at all, which is correct and
-- deliberate: a row in this view means visible ledger rows were summed. A zero
-- row would be indistinguishable from "you are not allowed to see this learner",
-- and the service is the right place to render an absent row as 0 XP.

REVOKE ALL ON public.xp_balances FROM PUBLIC, anon;
GRANT SELECT ON public.xp_balances TO authenticated;
