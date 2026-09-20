import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The service-role client. It bypasses RLS entirely — every policy in
 * src/db/rls/ stops applying the moment this client issues a query.
 *
 * This is the only module in the repository permitted to construct it
 * (CLAUDE.md R2). An ESLint rule bans importing this file from anywhere except
 * the allowlist below, and that ban is part of `npm run lint`, which CI runs on
 * every push. If you are here because a query returned nothing: the answer is
 * almost always a missing policy or a missing claim, not this client.
 *
 * Allowlisted callers, each with the reason RLS cannot serve it:
 *
 *   AdminReason.AUTH_ACTIVATION
 *     Creating the Supabase Auth user during activation. The caller has no
 *     session yet, so there are no claims for a policy to read.
 *
 *   AdminReason.TENANT_PROVISIONING
 *     Creating a school. There is no tenant to be inside of yet.
 *
 *   AdminReason.NOTIFICATION_FANOUT
 *     Writing one notification row per recipient. A session may only notify
 *     itself (src/db/rls/notifications.sql), which is what stops a compromised
 *     account from messaging the school.
 *
 * Adding a reason to this list is a decision, not a convenience: record it in
 * the docs/TECHNICAL_ARCHITECTURE.md D-table and run `hiraya-tenancy-auditor`.
 */

export enum AdminReason {
  AUTH_ACTIVATION = "auth_activation",
  TENANT_PROVISIONING = "tenant_provisioning",
  NOTIFICATION_FANOUT = "notification_fanout",
}

let cached: SupabaseClient | null = null;

/**
 * @param reason why RLS cannot serve this call. Required so that every use site
 *   is greppable and every reason is one of a short, reviewed list.
 */
export function createAdminClient(reason: AdminReason): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Service-role client requested without NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!Object.values(AdminReason).includes(reason)) {
    throw new Error(`Unrecognized AdminReason: ${String(reason)}`);
  }

  cached ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
