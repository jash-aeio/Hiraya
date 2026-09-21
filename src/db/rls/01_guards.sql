-- ===========================================================================
-- Hiraya RLS — structural guards
--
-- RLS decides which rows a role may touch. These triggers decide what is
-- possible at all, including for the table owner and the service role, because
-- two of Hiraya's claims must hold even against an administrator:
--
--   * A row can never move between schools (CLAUDE.md R1).
--   * The XP ledger and the audit log are append-only (R4, §6).
--
-- A revoked grant stops `authenticated`. A trigger also stops the owner, which
-- is the difference between "admins are not supposed to" and "admins cannot".
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION
    'append_only_violation: % is append-only; % is not permitted. Corrections are new rows.',
    TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_tenant_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    RAISE EXCEPTION
      'tenant_immutable: school_id on %.% cannot be changed once written.',
      TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- `schools.is_demo` cannot change after the row is written.
--
-- That one boolean is the entire authorization boundary for an unauthenticated
-- endpoint that returns learners' names, grades and sections (D23,
-- src/db/rls/02_demo_session.sql). Today every school in the database is
-- synthetic, so the blast radius is nil; after Gate B a real school will sit in
-- the same table, and a single wrong UPDATE would publish its roster.
--
-- A trigger cannot stop a school being *created* with the flag set wrong — the
-- server-config allowlist in src/lib/auth/demo-allowlist.ts is the second half
-- of that answer. What it does stop is every path that turns an existing real
-- tenant into a demo one: a mistaken manual UPDATE, a migration slip, or a
-- future admin toggle nobody has designed yet.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_demo_flag_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_demo IS DISTINCT FROM OLD.is_demo THEN
    RAISE EXCEPTION
      'demo_flag_immutable: schools.is_demo is fixed at creation. A tenant cannot become a demo tenant, or stop being one.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schools_demo_flag_immutable ON public.schools;
CREATE TRIGGER schools_demo_flag_immutable
  BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.prevent_demo_flag_change();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Attach the guards to every table that qualifies.
--
-- This loops rather than listing tables one by one so that a table added in a
-- later migration cannot quietly miss a guard: whoever adds it runs `db:rls`,
-- and the guard attaches itself. `db:verify-rls` then asserts the result, so
-- the loop is checked rather than trusted.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> '__drizzle_migrations'
    ORDER BY c.relname
  LOOP
    -- school_id immutability, for every table that carries one
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t.table_name
        AND column_name = 'school_id'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',
                     t.table_name || '_tenant_immutable', t.table_name);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_change()',
        t.table_name || '_tenant_immutable', t.table_name);
    END IF;

    -- updated_at maintenance, for every table that has the column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t.table_name
        AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',
                     t.table_name || '_touch_updated_at', t.table_name);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',
        t.table_name || '_touch_updated_at', t.table_name);
    END IF;
  END LOOP;
END;
$$;

-- Append-only tables, named explicitly: this list is a policy decision, not a
-- property of the schema, so it must be read and not inferred.
DROP TRIGGER IF EXISTS xp_ledger_append_only ON public.xp_ledger;
CREATE TRIGGER xp_ledger_append_only
  BEFORE UPDATE OR DELETE ON public.xp_ledger
  FOR EACH ROW EXECUTE FUNCTION public.reject_mutation();

DROP TRIGGER IF EXISTS xp_ledger_truncate_guard ON public.xp_ledger;
CREATE TRIGGER xp_ledger_truncate_guard
  BEFORE TRUNCATE ON public.xp_ledger
  FOR EACH STATEMENT EXECUTE FUNCTION public.reject_mutation();

DROP TRIGGER IF EXISTS audit_log_append_only ON public.audit_log;
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.reject_mutation();

DROP TRIGGER IF EXISTS audit_log_truncate_guard ON public.audit_log;
CREATE TRIGGER audit_log_truncate_guard
  BEFORE TRUNCATE ON public.audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.reject_mutation();
