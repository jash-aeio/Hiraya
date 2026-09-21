# `src/db`

The schema, its migrations, and the policies that make tenancy a database property.

| Path | What it is |
|---|---|
| `schema.ts` | Drizzle table definitions. Every table but `schools` carries `school_id uuid NOT NULL`, indexed. |
| `enums.ts` | Database enum types, re-exported from `schema.ts` so `db:generate` emits them. |
| `rls/00_functions.sql` | The four JWT-claim readers every policy is built from. |
| `rls/01_guards.sql` | Triggers: `school_id` immutability, `updated_at`, and the append-only rejections. |
| `rls/<table>.sql` | One file per table: `ENABLE`/`FORCE ROW LEVEL SECURITY`, explicit GRANTs, and its policies. |
| `rls/04_xp_balances.sql` | The `xp_balances` view. Derived, not a table, so it has no policy of its own — `security_invoker = true` is what makes it defer to the reader's. |
| `../../drizzle/` | Generated migration SQL. Read it before applying it. |

## Workflow

```bash
npm run db:generate    # after editing schema.ts — then READ drizzle/*.sql
npm run db:migrate     # applies migrations AND policies, in that order
npm run db:verify-rls  # asserts the invariants actually landed
```

`db:migrate` runs both steps deliberately. A table that exists without its policy is readable across
tenants for as long as the gap lasts, so there is no supported way to create one without the other.
Every policy file is idempotent, so re-running is always safe.

## Adding a table

1. Define it in `schema.ts` with `school_id`, `created_at`, `updated_at`, and an index on `school_id`.
2. **Write `rls/<table>.sql` before writing any query against the table.** A policy written afterwards
   gets written *around* the queries — it ends up permitting whatever the code already does rather than
   what the rules allow.
3. Seed it in `tests/integration/helpers/fixtures.ts`. The cross-tenant test enumerates tables from the
   live schema and fails if one is unseeded, so coverage cannot silently lapse.
4. `npm run db:generate`, read the SQL, `npm run db:migrate`, `npm test`.
5. Run the `hiraya-tenancy-auditor` agent.

## Adding a view

Views live here too, and are dropped and recreated on every `db:rls` run rather than generated into a
migration. A view is **not** covered by RLS: it reads as its *owner* unless it is declared
`WITH (security_invoker = true)`, which makes it read as the caller instead and defer to their policies
on the tables beneath it. So every view in `public` must carry that option, and `db:verify-rls` fails
the build for one that does not — checks 1-6 would never notice, because they enumerate tables.

A materialized view is banned outright (D19): it holds its own copy of the rows and cannot carry a
policy at all, which makes it readable across schools by anyone granted SELECT.

Declare the view in `schema.ts` with `pgView(...).existing()` so queries against it are typed without
drizzle-kit trying to own it.

## What the rules are

- **Tenancy** — `school_id = current_school_id()`, where `current_school_id()` reads a JWT claim. No
  endpoint accepts a `school_id` from client input, ever.
- **Roles** — write policies restrict by role, not only by tenant. School-wide roles come from
  `roles[]`; per-organization authority comes from `org_grants[]` and is checked with `has_org_role()`.
- **Append-only** — `xp_ledger` and `audit_log` hold no UPDATE or DELETE grant for any role, and a
  trigger rejects the attempt even from the table owner.
- **LRN** — lives in `profile_identifiers`, not on `profiles`, because RLS is row-level: hiding one
  column from one role is not something a policy can express.
