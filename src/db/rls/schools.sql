-- schools — the tenant root. A session sees exactly one row: its own school.
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.schools FROM anon, authenticated;
GRANT SELECT ON public.schools TO authenticated;

-- Tenant creation and renaming are Super Admin operations performed through
-- src/lib/db/admin.ts. No authenticated session may write here, which is why
-- no INSERT, UPDATE or DELETE policy exists and no such grant is made.
DROP POLICY IF EXISTS schools_select_own_tenant ON public.schools;
CREATE POLICY schools_select_own_tenant ON public.schools
  FOR SELECT TO authenticated
  USING (id = public.current_school_id());
