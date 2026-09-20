-- leaderboard_snapshots — precomputed standings, read by everyone in the school.
--
-- Leaderboards read from here rather than aggregating xp_ledger per request,
-- which is both the performance decision and a privacy one: a learner who has
-- hidden themselves from boards is excluded when the snapshot is computed, so
-- their absence is not something a client is trusted to honour (FR-5.8).
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.leaderboard_snapshots FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard_snapshots TO authenticated;

DROP POLICY IF EXISTS leaderboard_snapshots_select_tenant ON public.leaderboard_snapshots;
CREATE POLICY leaderboard_snapshots_select_tenant ON public.leaderboard_snapshots
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS leaderboard_snapshots_write_admin ON public.leaderboard_snapshots;
CREATE POLICY leaderboard_snapshots_write_admin ON public.leaderboard_snapshots
  FOR ALL TO authenticated
  USING (school_id = public.current_school_id() AND public.is_school_admin())
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());
