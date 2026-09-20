-- ===========================================================================
-- Hiraya RLS — claim readers
--
-- Every tenancy policy in this directory is built from these four functions.
-- They read the JWT claims stamped at login (docs/DATA_FLOW.md §3): the school
-- and roles a request carries are asserted by the token, never by the request
-- body. An endpoint that accepts a school_id from client input is a critical
-- tenancy defect regardless of what else guards it.
--
-- STABLE, not IMMUTABLE: the value is constant within a statement but changes
-- between transactions. SET search_path = '' so a caller cannot shadow these
-- with a same-named function in a schema earlier on their own search_path.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.auth_claims()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  )
$$;

COMMENT ON FUNCTION public.auth_claims() IS
  'JWT claims for the current request, or an empty object when unauthenticated.';

CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NULLIF(public.auth_claims() ->> 'school_id', '')::uuid
$$;

COMMENT ON FUNCTION public.current_school_id() IS
  'The tenant of the current request. NULL when unauthenticated, which makes every tenancy policy fail closed.';

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NULLIF(public.auth_claims() ->> 'profile_id', '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.has_role(target text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(public.auth_claims() -> 'roles' ? target, false)
$$;

COMMENT ON FUNCTION public.has_role(text) IS
  'True when the claims carry this school-scoped role.';

CREATE OR REPLACE FUNCTION public.has_any_role(targets text[])
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(public.auth_claims() -> 'roles' ?| targets, false)
$$;

-- Org-scoped grants are claims of the shape
--   "org_grants": [{ "org_id": "<uuid>", "role": "org_officer" }, ...]
-- An officer of one organization gets no authority over another's records.
CREATE OR REPLACE FUNCTION public.has_org_role(target text, org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      COALESCE(public.auth_claims() -> 'org_grants', '[]'::jsonb)
    ) AS g
    WHERE g ->> 'org_id' = org::text
      AND g ->> 'role' = target
  )
$$;

CREATE OR REPLACE FUNCTION public.is_school_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT public.has_role('school_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_school_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT public.has_any_role(ARRAY[
    'org_officer', 'org_adviser', 'sslg_officer', 'sslg_adviser',
    'moderator', 'guidance', 'school_head', 'school_admin'
  ])
$$;
