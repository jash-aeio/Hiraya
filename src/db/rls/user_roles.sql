-- user_roles — who may do what. Writable by School Admin, and by an org
-- adviser within their own organization (they appoint officers, §2).
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

DROP POLICY IF EXISTS user_roles_select_self_or_staff ON public.user_roles;
CREATE POLICY user_roles_select_self_or_staff ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (profile_id = public.current_profile_id() OR public.is_school_staff())
  );

-- An org adviser may grant only org-scoped roles, and only in their own org:
-- org_id must be non-null and match a grant they actually hold. Without the
-- non-null check, an adviser could mint a school-wide role for themselves.
DROP POLICY IF EXISTS user_roles_insert_admin_or_adviser ON public.user_roles;
CREATE POLICY user_roles_insert_admin_or_adviser ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR (org_id IS NOT NULL AND public.has_org_role('org_adviser', org_id))
    )
  );

DROP POLICY IF EXISTS user_roles_update_admin_or_adviser ON public.user_roles;
CREATE POLICY user_roles_update_admin_or_adviser ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR (org_id IS NOT NULL AND public.has_org_role('org_adviser', org_id))
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR (org_id IS NOT NULL AND public.has_org_role('org_adviser', org_id))
    )
  );

-- Roles must be revocable: an officer whose term ends keeps nothing.
DROP POLICY IF EXISTS user_roles_delete_admin_or_adviser ON public.user_roles;
CREATE POLICY user_roles_delete_admin_or_adviser ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      public.is_school_admin()
      OR (org_id IS NOT NULL AND public.has_org_role('org_adviser', org_id))
    )
  );
