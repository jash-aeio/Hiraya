-- notifications — strictly personal. Nobody reads anyone else's, including
-- admins: there is no support case that requires it, and the payloads describe
-- a minor's movements around the school.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

DROP POLICY IF EXISTS notifications_select_self ON public.notifications;
CREATE POLICY notifications_select_self ON public.notifications
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND profile_id = public.current_profile_id()
  );

-- Fan-out is a server-side job performed by withServiceRole() for its one
-- documented reason (src/lib/db/admin.ts), which runs as the table owner and
-- so is not filtered here. A session may only notify itself, which is what
-- stops a compromised account from messaging the school.
DROP POLICY IF EXISTS notifications_insert_self ON public.notifications;
CREATE POLICY notifications_insert_self ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = public.current_school_id()
    AND profile_id = public.current_profile_id()
  );

DROP POLICY IF EXISTS notifications_update_self ON public.notifications;
CREATE POLICY notifications_update_self ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND profile_id = public.current_profile_id()
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND profile_id = public.current_profile_id()
  );

DROP POLICY IF EXISTS notifications_delete_self ON public.notifications;
CREATE POLICY notifications_delete_self ON public.notifications
  FOR DELETE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND profile_id = public.current_profile_id()
  );
