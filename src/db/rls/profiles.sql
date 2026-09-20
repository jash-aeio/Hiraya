-- profiles — names, grade and section. Visible to schoolmates by design: the
-- paper world already works this way. Cross-school visibility is the failure
-- this file exists to prevent.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM anon, authenticated;
-- No DELETE grant: a learner who leaves is archived, never deleted, because the
-- school must keep participation records (threat T14, docs/SYSTEM_DESIGN.md §10).
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_select_tenant ON public.profiles;
CREATE POLICY profiles_select_tenant ON public.profiles
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

-- Roster import only.
DROP POLICY IF EXISTS profiles_insert_admin ON public.profiles;
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());

-- A learner may edit their own row (avatar, locale, board visibility); School
-- Admin may edit any row in the school. Which columns each may change is
-- enforced by the trigger at the foot of this file, because RLS is row-level and
-- cannot express it. school_id itself is immutable by trigger (01_guards.sql).
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (id = public.current_profile_id() OR public.is_school_admin())
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (id = public.current_profile_id() OR public.is_school_admin())
  );

-- ---------------------------------------------------------------------------
-- Column discipline, enforced rather than intended.
--
-- RLS is row-level: `authenticated` is one role, so a column-level GRANT cannot
-- say "a learner may change their avatar but not their section." A trigger can.
--
-- This matters beyond tidiness. `grade_level` and `section` drive event
-- eligibility and the section and grade leaderboards, and `username` is how a
-- learner logs in. A learner who can edit those can enter events they are not
-- eligible for and move themselves into an easier leaderboard -- so the rule
-- belongs next to the data, not in whichever service happens to touch the row.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.profiles_restrict_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- School Admin maintains the roster: corrections, transfers, archiving.
  IF public.is_school_admin() THEN
    RETURN NEW;
  END IF;

  -- Anyone else editing a profile may change only their own presentation.
  IF NEW.username        IS DISTINCT FROM OLD.username
     OR NEW.display_name IS DISTINCT FROM OLD.display_name
     OR NEW.grade_level  IS DISTINCT FROM OLD.grade_level
     OR NEW.section      IS DISTINCT FROM OLD.section
     OR NEW.status       IS DISTINCT FROM OLD.status
     OR NEW.user_id      IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION
      'profile_field_restricted: only School Admin may change roster fields on a profile.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_restrict_self_edit ON public.profiles;
CREATE TRIGGER profiles_restrict_self_edit
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_restrict_self_edit();
