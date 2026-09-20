import "server-only";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import * as schema from "@/db/schema";

/**
 * The RLS-bypassing paths. Every policy in src/db/rls/ stops applying the
 * moment anything here issues a query.
 *
 * This is the only module in the repository permitted to construct them
 * (CLAUDE.md R2). An ESLint rule bans importing this file from anywhere except
 * the allowlist in eslint.config.mjs, and that ban is part of `npm run lint`,
 * which CI runs on every push. If you are here because a query returned
 * nothing: the answer is almost always a missing policy or a missing claim, not
 * this module.
 *
 * There are two, because they are not the same privilege and must not share an
 * entry point:
 *
 *   withServiceRole   — `service_role` over Drizzle. For tables.
 *   adminAuthApi      — Supabase Auth (GoTrue) admin. For accounts, not tables.
 *
 * Why the database half is not supabase-js: the project's Data API (PostgREST)
 * is disabled (D22), so `.from()` reaches nothing at all. That is deliberate —
 * /api/v1 is the single data layer (R3), and an exposed PostgREST is a second
 * one whose authorization rests entirely on no policy ever being missed.
 *
 * Allowlisted reasons, each with the reason RLS cannot serve it:
 *
 *   AdminReason.AUTH_ACTIVATION      (auth)
 *     Creating the Supabase Auth user during activation. The caller has no
 *     session yet, so there are no claims for a policy to read.
 *
 *   AdminReason.TENANT_PROVISIONING  (database)
 *     Creating a school. There is no tenant to be inside of yet.
 *
 *   AdminReason.NOTIFICATION_FANOUT  (database)
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

/**
 * Which half of this module each reason is allowed to reach. Enforced rather
 * than documented, so that "create the auth user" can never quietly become
 * "and also write to profiles while I am here".
 */
const DATABASE_REASONS: ReadonlySet<AdminReason> = new Set([
  AdminReason.TENANT_PROVISIONING,
  AdminReason.NOTIFICATION_FANOUT,
]);

const AUTH_REASONS: ReadonlySet<AdminReason> = new Set([AdminReason.AUTH_ACTIVATION]);

// ---------------------------------------------------------------------------
// Database: service_role, unmasked by any policy
// ---------------------------------------------------------------------------

/**
 * A pool of its own rather than a borrowed one. src/lib/db/client.ts holds an
 * owner connection too, but it never issues a query before dropping to
 * `authenticated`; exporting a way to escalate instead would put an unguarded
 * RLS bypass behind an import that no lint rule watches. Two small pools is
 * the cheaper mistake.
 */
let connectionCache: ReturnType<typeof postgres> | null = null;

function connection(): ReturnType<typeof postgres> {
  if (connectionCache) return connectionCache;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  connectionCache = postgres(connectionString, {
    // Deliberately small: every connection here is unfiltered by RLS, and
    // nothing on this path is a request hot spot.
    max: Number(process.env.DATABASE_ADMIN_POOL_MAX ?? 2),
    // Supabase's pooler does not support prepared statements in transaction mode.
    prepare: false,
  });
  return connectionCache;
}

export type Database = PostgresJsDatabase<typeof schema>;
export type ServiceRoleTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Runs `fn` as `service_role`, with no policies in force and no tenant claims
 * set. Whatever `school_id` the work belongs to must therefore be passed in and
 * written explicitly — there is no `current_school_id()` here to fall back on,
 * and a row inserted without one is a cross-tenant bug that RLS will not catch
 * on the way in.
 *
 * Why `SET LOCAL ROLE` rather than simply querying as the owner: every policy
 * file declares FORCE ROW LEVEL SECURITY, which subjects the owner to policies
 * too. Whether the login role escapes that depends on its BYPASSRLS attribute
 * — an implicit dependency on how the connection string happens to be
 * provisioned, and one that differs between a Supabase project and the
 * embedded Postgres the tests run on. `service_role` has BYPASSRLS in both
 * (scripts/bootstrap-roles.sql mirrors Supabase), so naming it makes the
 * bypass explicit, symmetrical with `withTenant`, and identical everywhere.
 *
 * @param reason why RLS cannot serve this call. Required so that every use site
 *   is greppable and every reason is one of a short, reviewed list.
 */
export async function withServiceRole<T>(
  reason: AdminReason,
  fn: (tx: ServiceRoleTransaction) => Promise<T>,
): Promise<T> {
  if (!DATABASE_REASONS.has(reason)) {
    throw new Error(`AdminReason.${reason} is not a database reason; see src/lib/db/admin.ts.`);
  }
  return drizzle(connection(), { schema }).transaction(async (tx) => {
    // Transaction-scoped: the connection returns to the pool as the plain owner.
    await tx.execute(sql`set local role service_role`);
    return fn(tx);
  });
}

// ---------------------------------------------------------------------------
// Auth: GoTrue admin, and nothing else
// ---------------------------------------------------------------------------

/**
 * Only the `auth.admin` surface is returned, never the client that carries it.
 * The narrowing is the point: it makes `.from()`, `.rpc()` and `.storage`
 * unreachable by type rather than by convention, so no future call can start
 * depending on the Data API that D22 turned off.
 */
type AuthAdminApi = SupabaseClient["auth"]["admin"];

let authClientCache: SupabaseClient | null = null;

/**
 * @param reason why RLS cannot serve this call — must be an auth reason.
 */
export function adminAuthApi(reason: AdminReason): AuthAdminApi {
  if (!AUTH_REASONS.has(reason)) {
    throw new Error(`AdminReason.${reason} is not an auth reason; see src/lib/db/admin.ts.`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Service-role auth client requested without NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  authClientCache ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return authClientCache.auth.admin;
}
