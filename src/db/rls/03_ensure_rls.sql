-- ===========================================================================
-- Hiraya — the RLS safety net for tables nobody wrote rules for (D22)
--
-- An event trigger that enables row level security on every table created in
-- `public`, so that a table added by a migration is protected from the moment
-- it exists rather than from the moment someone remembers a policy file.
--
-- Why it is in the repository as of 2026-09-21: it was not. It existed only on
-- the Supabase project, created by hand, which meant a rebuilt database or a
-- second environment would silently not have it — and the check it performs is
-- invisible when it is missing, which is the worst property a safety net can
-- have. `db:verify-rls` also found `anon` holding EXECUTE on it, from Supabase's
-- default privileges on new functions; that is revoked at the foot of this file.
--
-- This is a net, not a policy. RLS enabled with no policy denies everything,
-- which is the correct failure: the table is unreadable until someone writes
-- src/db/rls/<table>.sql, and `db:verify-rls` names it until they do.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- pg_catalog is implicitly searched, so this pins the path without keeping the
-- function from reaching pg_event_trigger_ddl_commands().
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name = 'public' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        -- Deliberately swallowed: a DDL statement must not fail because the net
        -- could not be applied. db:verify-rls is what turns a miss into an error.
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
    ELSE
      RAISE LOG 'rls_auto_enable: skipped % (schema %)', cmd.object_identity, cmd.schema_name;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.rls_auto_enable() IS
  'Event-trigger body: enables RLS on every table created in public (D22).';

-- Creating an event trigger requires superuser, which a managed Postgres role
-- may not hold. Failing the whole policy run over the net would be the wrong
-- trade, so a refusal warns and leaves the existing trigger in place — it is
-- already present on the Supabase project under this name.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname = 'ensure_rls') THEN
    BEGIN
      CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
        WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
        EXECUTE FUNCTION public.rls_auto_enable();
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE WARNING
          'ensure_rls: not created (needs superuser). Create it once in the Supabase SQL editor.';
    END;
  END IF;
END;
$$;

-- Nobody calls this: the event trigger machinery invokes it as the owner. It is
-- SECURITY DEFINER, so the default privileges Supabase grants on new functions
-- would otherwise leave an owner-privileged function callable by anon.
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;
