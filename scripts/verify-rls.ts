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
 *   7. no SECURITY DEFINER function is callable by `anon` or leaves its
 *      search_path unpinned (functions that run as the owner, past RLS)
 *   8. every view is `security_invoker`, and no materialized view exists
 *      (views that read as their owner, past RLS — checks 1-6 never see them)
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

    // 7. SECURITY DEFINER functions. These run as the owner, so RLS does not
    //    apply to them and their grants are the only thing standing between a
    //    role and whatever they select. Supabase grants ALL on new functions in
    //    `public` to anon, authenticated and service_role by default privilege
    //    (scripts/bootstrap-roles.sql mirrors it), so one left at its defaults
    //    is an RLS bypass reachable by anyone who reaches the database — and
    //    unlike a missing policy, nothing else in this script would notice.
    const definers = await sql<
      {
        name: string;
        args: string;
        anon: boolean;
        service_role: boolean;
        pins_search_path: boolean;
        owner: string;
        owner_bypasses_rls: boolean;
      }[]
    >`
      SELECT p.proname AS name,
             pg_get_function_identity_arguments(p.oid) AS args,
             has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
             has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role,
             COALESCE(p.proconfig::text LIKE '%search_path=%', false) AS pins_search_path,
             o.rolname AS owner,
             (o.rolsuper OR o.rolbypassrls) AS owner_bypasses_rls
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_roles o ON o.oid = p.proowner
      WHERE n.nspname = 'public' AND p.prosecdef
      ORDER BY p.proname
    `;
    for (const fn of definers) {
      const signature = `${fn.name}(${fn.args})`;
      if (fn.anon) {
        findings.push({
          severity: "CRITICAL",
          detail: `${signature}: SECURITY DEFINER and anon holds EXECUTE — an RLS bypass callable without a session`,
        });
      }
      if (fn.service_role) {
        /*
         * service_role already sees past RLS on every table, so EXECUTE here
         * grants it nothing new — but it does put a second, undeclared caller
         * on a function whose whole safety argument is the short list of things
         * it can be asked to do. R2 confines the privileged path to
         * src/lib/db/admin.ts and a named reason; a definer function callable
         * as service_role is a way around that list which nothing would
         * otherwise notice. Every file in src/db/rls/ revokes it explicitly,
         * and this is what keeps the next one honest.
         */
        findings.push({
          severity: "HIGH",
          detail: `${signature}: SECURITY DEFINER and service_role holds EXECUTE — revoke it; the privileged path is src/lib/db/admin.ts, not this`,
        });
      }
      if (!fn.pins_search_path) {
        findings.push({
          severity: "HIGH",
          detail: `${signature}: SECURITY DEFINER without SET search_path — a caller can shadow the tables it reads`,
        });
      }
      if (!fn.owner_bypasses_rls) {
        /*
         * Every tenant table here is FORCE ROW LEVEL SECURITY, and FORCE means
         * the policies apply to the table's OWNER too. A SECURITY DEFINER
         * function runs as its owner, so unless that role is a superuser or
         * holds BYPASSRLS, the function reads under the *caller's* policies
         * while believing it reads above them.
         *
         * That failure is silent and it is not a leak — it is the opposite. It
         * under-reads: public.leaderboard would rank a learner against nobody
         * but themselves, and public.register_for_event would count a full
         * event as empty and overbook it. Locally the owner is a superuser and
         * nothing notices, which is exactly why this is checked here rather
         * than trusted to a test.
         *
         * If this fires on Supabase at M-01, the fix is to own these functions
         * with a role that holds BYPASSRLS — never to drop FORCE.
         */
        findings.push({
          severity: "CRITICAL",
          detail: `${signature}: SECURITY DEFINER owned by '${fn.owner}', which neither is a superuser nor holds BYPASSRLS — under FORCE ROW LEVEL SECURITY this function reads under the caller's policies, so capacity counts and leaderboards will be silently wrong`,
        });
      }
    }

    // 8. Views. A view runs as its OWNER unless it is declared
    //    `security_invoker = true`, so an ordinary view over a tenant table is
    //    an RLS bypass wearing a table's clothes — and checks 1-6 never look at
    //    it, because they enumerate relkind 'r'. A materialized view is worse
    //    still: it holds its own copy of the rows and cannot carry a policy at
    //    all, which is why D19 bans them outright.
    //
    //    Two known limits, both deliberate. It looks only at `public`, because
    //    widening it would enumerate Supabase's own auth/storage/realtime views
    //    and drown the signal — and with the Data API disabled (D22), `public`
    //    is the only schema anything reaches. And it does not check
    //    `security_barrier`, which matters only for a view that filters rows in
    //    its own definition; xp_balances does not, and the day one does is the
    //    day to add it.
    const views = await sql<{ name: string; kind: string; opts: string | null }[]>`
      SELECT c.relname AS name,
             c.relkind::text AS kind,
             array_to_string(c.reloptions, ',') AS opts
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
      ORDER BY c.relname
    `;
    for (const v of views) {
      if (v.kind === "m") {
        findings.push({
          severity: "CRITICAL",
          detail: `${v.name}: a materialized view in public — it cannot carry an RLS policy, so it is readable across schools (D19)`,
        });
        continue;
      }
      if (!/security_invoker=(true|on)/i.test(v.opts ?? "")) {
        findings.push({
          severity: "CRITICAL",
          detail: `${v.name}: view without security_invoker=true — it reads as its owner, past every policy on the tables beneath it`,
        });
      }

      const [grant] = await sql<{ any_priv: boolean }[]>`
        SELECT has_table_privilege('anon', ${"public." + v.name}, 'SELECT') AS any_priv
      `;
      if (grant?.any_priv) {
        findings.push({
          severity: "HIGH",
          detail: `${v.name}: anon holds SELECT on a view — unauthenticated traffic should never reach one`,
        });
      }
    }

    process.stdout.write(
      `Checked ${tables.length} tables · ${policies.length} policies · ${APPEND_ONLY.length} append-only tables · ${definers.length} SECURITY DEFINER functions · ${views.length} views\n`,
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
