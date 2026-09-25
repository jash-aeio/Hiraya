-- ===========================================================================
-- Hiraya — the demo's standing live event (D-07)
--
-- `db:seed:demo` gives Club Fair a five-hour window measured from the moment
-- the seed ran, so a tenant seeded yesterday has no event an officer can open a
-- gate for and the check-in half of the demo — the half the whole product
-- argument rests on — cannot be walked at all. Since M-01 that demo is a public
-- URL, so the staleness is public too.
--
-- The fix is to make `happeningNow` a property of the event rather than of the
-- moment it was seeded: this function re-centres the marked event's window on
-- now, keeping the seeded duration. It is called once per persona switch
-- (src/features/demo/service.ts), not per request.
--
-- What was deliberately NOT done, because it is the trade CLAUDE.md §1 names:
-- the scan window itself is untouched. `isWithinScanWindow`
-- (src/features/checkin/service.ts) still decides every write against server
-- time, and the rolled window is still a real five hours that a scan can fall
-- outside of. Giving the demo an event that never ends would have been three
-- lines in the seed and would have made the one event a teacher watches us scan
-- into the one event where the window cannot refuse anything.
--
-- SECURITY DEFINER, and unlike the read functions in 02_demo_session.sql this
-- one WRITES. Three things bound it, and none is a rule somebody has to
-- remember in a service:
--
--   1. `s.is_demo` — the same database fact that gates the session itself, and
--      the reason a real tenant is unreachable from here rather than merely
--      unrequested.
--   2. `e.demo_rolls_live` — set by the seed on exactly one event. Without it
--      the function would rewrite the timetable of every demo event, including
--      the past ones the XP ledger already cites.
--   3. The caller names the school, and has already had to get past
--      src/lib/auth/demo-allowlist.ts to learn its id — so D25's second fact
--      holds here too. A caller naming a school it invented updates nothing,
--      because (1) still has to be true.
--
-- The UPDATE is a no-op while the event is live: the WHERE matches nothing, so
-- the common case writes no rows and the function is safe to call on every
-- switch. `updated_at` is left to the events_touch_updated_at trigger
-- (01_guards.sql), which is why it is not in the SET list.
-- ===========================================================================

-- VOLATILE and a non-scalar return, so CREATE OR REPLACE is enough; it is
-- dropped first only to keep the signature free to change in a later phase.
DROP FUNCTION IF EXISTS public.demo_roll_live_events(uuid);

CREATE OR REPLACE FUNCTION public.demo_roll_live_events(target_school uuid)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rolled integer;
BEGIN
  UPDATE public.events e
     SET starts_at = now() - interval '1 hour',
         -- The seeded duration, carried rather than re-stated: the seed owns
         -- how long Club Fair runs (seed/demo-events.json), and a literal here
         -- would silently win the next time that file changes.
         ends_at = now() - interval '1 hour' + (e.ends_at - e.starts_at)
    FROM public.schools s
   WHERE s.id = e.school_id
     AND s.is_demo
     AND e.school_id = target_school
     AND e.demo_rolls_live
     AND now() NOT BETWEEN e.starts_at AND e.ends_at;

  GET DIAGNOSTICS rolled = ROW_COUNT;
  RETURN rolled;
END;
$$;

COMMENT ON FUNCTION public.demo_roll_live_events(uuid) IS
  'Re-centres a demo school''s standing live event on now, keeping its seeded duration. is_demo is the gate (D-07).';

-- ---------------------------------------------------------------------------
-- Who may call it. The reasoning is 02_demo_session.sql's, unchanged: Supabase
-- grants EXECUTE on a new function in `public` to anon, authenticated and
-- service_role by default privilege, and a SECURITY DEFINER function left at
-- those grants is an RLS bypass reachable by anyone who can reach the database.
-- `authenticated` only, because that is the role src/lib/db/client.ts drops to.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.demo_roll_live_events(uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.demo_roll_live_events(uuid) TO authenticated;
