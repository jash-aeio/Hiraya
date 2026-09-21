-- Roles that Supabase provides and a bare Postgres does not.
--
-- Applied only to local and CI databases, never to a Supabase project, where
-- these roles already exist. Without them the policy files cannot be applied at
-- all, which is deliberate: the tests run against the same GRANT and REVOKE
-- statements production uses, not a relaxed copy of them.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    -- BYPASSRLS mirrors Supabase: the service role is exactly the thing RLS does
    -- not stop, which is why CLAUDE.md R2 confines its key to one module.
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Supabase grants these three roles ALL on every table created in `public`, by
-- default privilege, and the policy files in src/db/rls/ then revoke what each
-- role must not keep. Mirroring that here is not a convenience: without it a
-- policy file that forgot its `REVOKE ALL ... FROM anon` would still pass
-- locally, because anon would never have held the privilege in the first place,
-- and the same file would be a live leak on the project. The local database has
-- to start as permissive as production does, or the revokes are untested.
--
-- Default privileges attach to objects created later by the role that runs this,
-- which is the same role the migrations run as.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
