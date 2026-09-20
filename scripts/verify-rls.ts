import { readdir } from "node:fs/promises";
import { join } from "node:path";

import postgres from "postgres";

import { requireEnv } from "./env";
import { isMain } from "./is-main";

/**
 * Asserts the tenancy invariants against a live database.
 *
 * `db:rls` applies policies; this proves they landed. It runs in CI because the
 * failure it catches is silent by nature: a table created without a policy
 * looks perfectly healthy until the day two schools are in the same database.
 *
 * Checks, in the order they would bite:
 *   1. every table has a policy file (a table nobody wrote rules for)
 *   2. RLS enabled and FORCEd (policies that exist but do not apply)
 *   3. school_id present, NOT NULL, indexed (rows with no tenant)
 *   4. a policy that actually compares school_id to current_school_id()
 *   5. append-only tables hold no UPDATE/DELETE grant and carry their trigger
 *   6. `anon` holds no privilege on anything (pre-login reads)
 */

const APPEND_ONLY = ["xp_ledger", "audit_log"] as const;
const EXEMPT_FROM_SCHOOL_ID = ["schools", "__drizzle_migrations"] as const;

type Finding = { severity: "CRITICAL" | "HIGH"; detail: string };

export async function verifyRls(connectionString: string): Promise<Finding[]> {
  const sql = postgres(connectionString, { max: 1, onnotice: () => {} });
  const findings: Finding[] = [];

  try {
    const tables = await sql<{ table_name: string; rls: boolean; forced: boolean }[]>`
      SELECT c.relname AS table_name,
             c.relrowsecurity AS rls,
             c.relforcerowsecurity AS forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname <> '__drizzle_migrations'
      ORDER BY c.relname
    `;

    if (tables.length === 0) {
      findings.push({
        severity: "CRITICAL",
        detail: "No tables found. Has `npm run db:migrate` been run against this database?",
      });
      return findings;
    }

    // 1. A policy file per table.
    const policyFiles = new Set(
      (await readdir(join(process.cwd(), "src", "db", "rls")))
        .filter((f) => f.endsWith(".sql"))
        .map((f) => f.replace(/\.sql$/, "")),
    );
    for (const { table_name } of tables) {
      if (!policyFiles.has(table_name)) {
        findings.push({
          severity: "CRITICAL",
          detail: `${table_name}: no src/db/rls/${table_name}.sql — the table exists with rules nobody wrote`,
        });
      }
    }

    // 2. RLS enabled and forced.
    for (const t of tables) {
      if (!t.rls) {
        findings.push({ severity: "CRITICAL", detail: `${t.table_name}: RLS is not enabled` });
      }
      if (!t.forced) {
        findings.push({
          severity: "HIGH",
          detail: `${t.table_name}: RLS is not FORCEd, so the table owner bypasses every policy`,
        });
      }
    }

    // 3. school_id present, NOT NULL, indexed.
    for (const { table_name } of tables) {
      if ((EXEMPT_FROM_SCHOOL_ID as readonly string[]).includes(table_name)) continue;

      const [column] = await sql<{ is_nullable: string }[]>`
        SELECT is_nullable FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table_name} AND column_name = 'school_id'
      `;
      if (!column) {
        findings.push({ severity: "CRITICAL", detail: `${table_name}: no school_id column` });
        continue;
      }
      if (column.is_nullable !== "NO") {
        findings.push({
          severity: "CRITICAL",
          detail: `${table_name}: school_id is nullable — a row with no tenant is a row outside every policy`,
        });
      }

      const [indexed] = await sql<{ ok: boolean }[]>`
        SELECT EXISTS (
          SELECT 1
          FROM pg_index i
          JOIN pg_class c ON c.oid = i.indrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = i.indkey[0]
          WHERE n.nspname = 'public' AND c.relname = ${table_name} AND a.attname = 'school_id'
        ) AS ok
      `;
      if (!indexed?.ok) {
        findings.push({
          severity: "HIGH",
          detail: `${table_name}: no index leading with school_id — every tenant-filtered read is a scan`,
        });
      }
    }

    // 4. A policy that compares against current_school_id().
    const policies = await sql<{ tablename: string; policyname: string; expr: string }[]>`
      SELECT tablename,
             policyname,
             COALESCE(qual, '') || ' ' || COALESCE(with_check, '') AS expr
      FROM pg_policies
      WHERE schemaname = 'public'
    `;
    for (const { table_name } of tables) {
      const own = policies.filter((p) => p.tablename === table_name);
      if (own.length === 0) {
        findings.push({
          severity: "CRITICAL",
          detail: `${table_name}: RLS is on with no policy at all — every read returns nothing and every rule is unstated`,
        });
        continue;
      }
      if (!own.some((p) => p.expr.includes("current_school_id"))) {
        findings.push({
          severity: "CRITICAL",
          detail: `${table_name}: no policy compares against current_school_id()`,
        });
      }
    }

    // 5. Append-only tables.
    for (const table of APPEND_ONLY) {
      for (const role of ["anon", "authenticated", "service_role"]) {
        const [grant] = await sql<{ can_update: boolean; can_delete: boolean }[]>`
          SELECT has_table_privilege(${role}, ${"public." + table}, 'UPDATE') AS can_update,
                 has_table_privilege(${role}, ${"public." + table}, 'DELETE') AS can_delete
        `;
        if (grant?.can_update || grant?.can_delete) {
          findings.push({
            severity: "CRITICAL",
            detail: `${table}: ${role} holds ${grant.can_update ? "UPDATE" : ""}${
              grant.can_update && grant.can_delete ? " and " : ""
            }${grant.can_delete ? "DELETE" : ""} — the ledger must be append-only for every role (R4)`,
          });
        }
      }

      const [trigger] = await sql<{ ok: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM pg_trigger t
          JOIN pg_class c ON c.oid = t.tgrelid
          WHERE c.relname = ${table} AND t.tgname = ${table + "_append_only"} AND NOT t.tgisinternal
        ) AS ok
      `;
      if (!trigger?.ok) {
        findings.push({
          severity: "HIGH",
          detail: `${table}: append-only trigger missing, so the table owner can still rewrite history`,
        });
      }
    }

    // 6. anon holds nothing. Pre-login traffic goes through Supabase Auth, not
    //    through table reads.
    for (const { table_name } of tables) {
      const [grant] = await sql<{ any_priv: boolean }[]>`
        SELECT (
          has_table_privilege('anon', ${"public." + table_name}, 'SELECT')
          OR has_table_privilege('anon', ${"public." + table_name}, 'INSERT')
          OR has_table_privilege('anon', ${"public." + table_name}, 'UPDATE')
          OR has_table_privilege('anon', ${"public." + table_name}, 'DELETE')
        ) AS any_priv
      `;
      if (grant?.any_priv) {
        findings.push({
          severity: "HIGH",
          detail: `${table_name}: anon holds a table privilege — unauthenticated traffic should never reach a table`,
        });
      }
    }

    process.stdout.write(
      `Checked ${tables.length} tables · ${policies.length} policies · ${APPEND_ONLY.length} append-only tables\n`,
    );
  } finally {
    await sql.end();
  }

  return findings;
}

async function main(): Promise<void> {
  const url = process.env.RLS_TARGET_URL ?? requireEnv("DATABASE_URL");
  const findings = await verifyRls(url);

  if (findings.length === 0) {
    process.stdout.write("RLS VERIFY: clean\n");
    return;
  }
  for (const f of findings) {
    process.stderr.write(`${f.severity}  ${f.detail}\n`);
  }
  process.stderr.write(`RLS VERIFY: ${findings.length} findings\n`);
  process.exit(1);
}

if (isMain(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
}
