import "server-only";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

/**
 * The default database client: every query runs as `authenticated`, under RLS,
 * inside a transaction that carries the caller's JWT claims.
 *
 * Why not read through supabase-js? Because Hiraya needs relational queries and
 * transactions (a check-in and its ledger row must commit together), which is
 * what Drizzle gives us. The cost is this file: a raw Postgres connection is
 * the table owner, and the owner is exactly who RLS does not stop. So no query
 * is ever issued on the bare connection — `withTenant` drops the transaction to
 * the `authenticated` role first, and the policies then apply to us the same way
 * they apply to a browser using the anon key.
 *
 * `SET LOCAL` and `set_config(..., true)` are transaction-scoped: when the
 * transaction ends the connection returns to the pool as the owner with no
 * claims, so one request's identity can never leak into the next one's.
 */

/**
 * Opened on first query rather than on import, so that `next build` and the unit
 * suite do not need database credentials to load a module. A missing variable
 * still fails loudly — just at the point where a query was actually attempted.
 */
let connectionCache: ReturnType<typeof postgres> | null = null;

function connection(): ReturnType<typeof postgres> {
  if (connectionCache) return connectionCache;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  connectionCache = postgres(connectionString, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    // Supabase's pooler does not support prepared statements in transaction mode.
    prepare: false,
  });
  return connectionCache;
}

function database(): Database {
  return drizzle(connection(), { schema });
}

export type Database = PostgresJsDatabase<typeof schema>;
export type TenantTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * The claims RLS reads. Resolved at login from the database (docs/DATA_FLOW.md
 * §3) and carried in the session token — never taken from a request body, which
 * is the single fastest way to hand one school another school's data.
 */
export interface TenantClaims {
  schoolId: string;
  profileId: string;
  roles: string[];
  orgGrants: { orgId: string; role: string }[];
}

/**
 * Runs `fn` as the `authenticated` role with these claims in force.
 *
 * Everything in `src/features/<feature>/service.ts` reads and writes through here. If a
 * service is tempted to reach past it, the answer is a policy change, not a
 * bypass.
 */
export async function withTenant<T>(
  claims: TenantClaims,
  fn: (tx: TenantTransaction) => Promise<T>,
): Promise<T> {
  const jwtClaims = JSON.stringify({
    school_id: claims.schoolId,
    profile_id: claims.profileId,
    roles: claims.roles,
    org_grants: claims.orgGrants.map((g) => ({ org_id: g.orgId, role: g.role })),
  });

  return database().transaction(async (tx) => {
    // Order matters: set the claims while still privileged, then drop the role
    // for the rest of the transaction.
    await tx.execute(sql`select set_config('request.jwt.claims', ${jwtClaims}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}

/**
 * Runs `fn` as `authenticated` with no claims at all.
 *
 * This is the pre-session privilege level: `current_school_id()` is NULL, so
 * every tenancy policy fails closed and no table in src/db/rls/ returns a row.
 * The only things reachable from here are the SECURITY DEFINER functions that
 * resolve a session in the first place (src/db/rls/02_demo_session.sql) and the
 * one that keeps the demo's live event live (08_demo_rolling_event.sql), which
 * carry their own gate in SQL.
 *
 * It exists because resolving claims is the one read that cannot present claims
 * — the same chicken-and-egg the Phase 1 login path will have (docs/DATA_FLOW.md
 * §3). Dropping the role anyway, rather than querying as the owner, keeps the
 * EXECUTE grants on those functions meaningful: if a future one is granted to
 * the wrong role, this call fails rather than quietly succeeding as the owner.
 */
export async function withoutClaims<T>(fn: (tx: TenantTransaction) => Promise<T>): Promise<T> {
  return database().transaction(async (tx) => {
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}

/** Liveness only. Touches no tenant data, so it needs no claims. */
export async function pingDatabase(): Promise<boolean> {
  const rows = await connection()`select 1 as ok`;
  return rows[0]?.ok === 1;
}
