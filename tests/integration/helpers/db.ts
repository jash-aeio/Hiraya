import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import type { Sql } from "postgres";

import { applyRls } from "../../../scripts/apply-rls";
import { assertDisposableDatabase } from "../../../scripts/env";
import { migrateAndProtect } from "../../../scripts/migrate";

/**
 * A real Postgres for the integration suite.
 *
 * RLS cannot be tested against a mock or an in-memory shim: policies, GRANTs and
 * triggers are the thing under test, and only Postgres implements them. So the
 * suite either uses TEST_DATABASE_URL (Supabase local, or the service container
 * in CI) or downloads and boots its own Postgres. Either way the schema is built
 * by the same `db:migrate` path production uses, so the tests cannot pass
 * against a relaxed copy of the rules.
 */

export interface TestDatabase {
  url: string;
  /** Owner connection. Seeds fixtures; bypasses RLS, which is why assertions never use it. */
  sql: Sql;
  stop: () => Promise<void>;
}

/** The same connection string, pointed at a different database on that server. */
function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Could not acquire a port")));
      }
    });
  });
}

/**
 * A scratch database name. Unique per call, so two test files never share one.
 */
function scratchName(): string {
  return `hiraya_test_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export async function startTestDatabase(): Promise<TestDatabase> {
  const external = process.env.TEST_DATABASE_URL;

  if (external) {
    assertDisposableDatabase(external);

    /*
     * Every test file calls this, and it must get a database of its own.
     *
     * The embedded path below already behaves that way — a fresh cluster per
     * file — and for a long time that was the only path anyone ran, so the
     * asymmetry went unnoticed: pointed at one long-lived server, every file
     * shared a single database and each one's fixtures leaked into the next
     * one's assertions. It surfaced as the demo seed refusing to run (it will
     * not write synthetic learners beside a school that is not `is_demo`) next
     * to a cross-tenant test whose whole job is to seed exactly such a school.
     *
     * Both tests were right. The isolation was missing, so create it here
     * rather than weakening either of them.
     */
    const name = scratchName();
    const admin = postgres(external, { max: 1, onnotice: () => {} });
    try {
      await admin.unsafe(`CREATE DATABASE ${name}`);
    } finally {
      await admin.end();
    }

    const url = withDatabase(external, name);
    await prepare(url);
    const sql = postgres(url, { max: 1, onnotice: () => {} });

    return {
      url,
      sql,
      stop: async () => {
        await sql.end();
        const cleanup = postgres(external, { max: 1, onnotice: () => {} });
        try {
          // FORCE (PG13+) so a connection the suite failed to close does not
          // leave a database behind on a shared server, run after run.
          await cleanup.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
        } finally {
          await cleanup.end();
        }
      },
    };
  }

  const dataDir = await mkdtemp(join(tmpdir(), "hiraya-pg-"));
  const port = await freePort();
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("hiraya_test");

  const url = `postgresql://postgres:postgres@127.0.0.1:${port}/hiraya_test`;
  await prepare(url);

  return {
    url,
    sql: postgres(url, { max: 1, onnotice: () => {} }),
    stop: async () => {
      await pg.stop();
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}

async function prepare(url: string): Promise<void> {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    // Supabase ships anon / authenticated / service_role; a bare Postgres does not.
    const roles = await readFile(join(process.cwd(), "scripts", "bootstrap-roles.sql"), "utf8");
    await sql.unsafe(roles);
  } finally {
    await sql.end();
  }

  await migrateAndProtect(url);
}

export interface TestClaims {
  schoolId: string;
  profileId: string;
  roles: string[];
  orgGrants?: { orgId: string; role: string }[];
}

/**
 * Runs `fn` exactly the way a request does: as the `authenticated` role, with
 * claims set for the transaction only. This mirrors withTenant() in
 * src/lib/db/client.ts deliberately — if the two ever diverge, the tests stop
 * describing production, which is the failure mode that makes a green suite
 * worse than no suite.
 */
export async function asUser<T>(
  sql: Sql,
  claims: TestClaims,
  fn: (tx: Sql) => Promise<T>,
): Promise<T> {
  const jwt = JSON.stringify({
    school_id: claims.schoolId,
    profile_id: claims.profileId,
    roles: claims.roles,
    org_grants: (claims.orgGrants ?? []).map((g) => ({ org_id: g.orgId, role: g.role })),
  });

  return sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${jwt}, true)`;
    await tx`set local role authenticated`;
    return fn(tx as unknown as Sql);
  }) as Promise<T>;
}

/** Re-applies policy files, for the test that proves the suite notices when RLS is off. */
export async function reapplyRls(url: string): Promise<void> {
  await applyRls(url);
}
