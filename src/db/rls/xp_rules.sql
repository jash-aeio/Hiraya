-- xp_rules — school-wide readable, because a learner is entitled to know what
-- earns points. Writable only by School Admin and the SSLG adviser: an org that
-- can set its own point values inflates its own events (threat T12, FR-5.3).
ALTER TABLE public.xp_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_rules FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.xp_rules FROM anon, authenticated;
-- No DELETE grant: rules are versioned by effective_from, so a past award can
-- still be explained by the rule in force when it was made.
GRANT SELECT, INSERT ON public.xp_rules TO authenticated;

DROP POLICY IF EXISTS xp_rules_select_tenant ON public.xp_rules;
CREATE POLICY xp_rules_select_tenant ON public.xp_rules
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS xp_rules_insert_point_setters ON public.xp_rules;
CREATE POLICY xp_rules_insert_point_setters ON public.xp_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (public.is_school_admin() OR public.has_role('sslg_adviser'))
  );
