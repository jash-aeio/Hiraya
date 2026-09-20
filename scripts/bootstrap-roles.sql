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
