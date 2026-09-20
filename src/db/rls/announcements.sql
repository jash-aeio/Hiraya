-- announcements — one feed, school and org scoped. A scheduled announcement is
-- invisible until its publish_at, enforced here rather than by a query filter.
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.announcements FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

DROP POLICY IF EXISTS announcements_select_published_or_authors ON public.announcements;
CREATE POLICY announcements_select_published_or_authors ON public.announcements
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      publish_at <= now()
      OR author_id = public.current_profile_id()
      OR public.is_school_admin()
      OR (org_id IS NOT NULL AND public.has_org_role('org_officer', org_id))
      OR (org_id IS NOT NULL AND public.has_org_role('org_adviser', org_id))
    )
  );

-- School-wide posts are limited to the SSLG officers and School Admin (§2);
-- an org post requires a grant in that organization.
DROP POLICY IF EXISTS announcements_insert_by_scope ON public.announcements;
CREATE POLICY announcements_insert_by_scope ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      CASE scope
        WHEN 'school' THEN public.is_school_admin() OR public.has_role('sslg_officer')
        WHEN 'org' THEN
          org_id IS NOT NULL
          AND (
            public.is_school_admin()
            OR public.has_org_role('org_officer', org_id)
            OR public.has_org_role('org_adviser', org_id)
          )
      END
    )
  );

DROP POLICY IF EXISTS announcements_update_author_or_admin ON public.announcements;
CREATE POLICY announcements_update_author_or_admin ON public.announcements
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (author_id = public.current_profile_id() OR public.is_school_admin())
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (author_id = public.current_profile_id() OR public.is_school_admin())
  );

DROP POLICY IF EXISTS announcements_delete_author_or_admin ON public.announcements;
CREATE POLICY announcements_delete_author_or_admin ON public.announcements
  FOR DELETE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (author_id = public.current_profile_id() OR public.is_school_admin())
  );
