-- consent_records — the gate on account activation, and evidence that the
-- processor arrangement was honoured. Metadata only: a reference to the paper
-- form the school holds, never a scan of it (docs/DATA_FLOW.md §4).
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.consent_records FROM anon, authenticated;
-- No DELETE grant: a consent record is evidence. Withdrawal sets revoked_at.
GRANT SELECT, INSERT, UPDATE ON public.consent_records TO authenticated;

DROP POLICY IF EXISTS consent_records_select_self_or_admin ON public.consent_records;
CREATE POLICY consent_records_select_self_or_admin ON public.consent_records
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (profile_id = public.current_profile_id() OR public.is_school_admin())
  );

DROP POLICY IF EXISTS consent_records_insert_admin ON public.consent_records;
CREATE POLICY consent_records_insert_admin ON public.consent_records
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());

DROP POLICY IF EXISTS consent_records_update_admin ON public.consent_records;
CREATE POLICY consent_records_update_admin ON public.consent_records
  FOR UPDATE TO authenticated
  USING (school_id = public.current_school_id() AND public.is_school_admin())
  WITH CHECK (school_id = public.current_school_id() AND public.is_school_admin());
