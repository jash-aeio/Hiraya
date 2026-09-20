-- audit_log — append-only, ids never names (CLAUDE.md R8).
--
-- INSERT is open to any authenticated session, but only for rows naming that
-- session as the actor: a user can record what they did and cannot attribute an
-- action to someone else. Reading is School Admin and the school head only,
-- because the trail includes every access to the non-participant list.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.audit_log FROM anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM PUBLIC;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;

DROP POLICY IF EXISTS audit_log_select_admin ON public.audit_log;
CREATE POLICY audit_log_select_admin ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (public.is_school_admin() OR public.has_role('school_head'))
  );

DROP POLICY IF EXISTS audit_log_insert_self_attributed ON public.audit_log;
CREATE POLICY audit_log_insert_self_attributed ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND actor_id = public.current_profile_id()
  );
