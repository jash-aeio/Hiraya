---
name: hiraya-feature-slice
description: Build a Hiraya feature as a vertical slice in the order that makes tenancy and validation impossible to forget - Drizzle schema, RLS policy, Zod contract, service, /api/v1 handler, UI, tests. Use when starting any new module or feature, adding an endpoint, or extending an existing slice in this repository.
---

# Hiraya feature slice

Build features in one fixed order. The order is the point: it puts the security-critical layers before
the code that would otherwise be written around them.

## When to use

- Starting a new module (`events`, `orgs`, `checkin`, `xp`, `announcements`, `identity`, …)
- Adding an endpoint to an existing module
- Extending a feature with new data

## Inputs required

| Input | Where from |
|---|---|
| Feature name and module | `docs/SYSTEM_DESIGN.md` §1 |
| PRD requirement IDs it satisfies | `docs/PRD.md` §5 |
| Roadmap phase | `docs/MILESTONE_ROADMAP.md` |
| Which roles may do what | `docs/SYSTEM_DESIGN.md` §2 |

**Stop if the feature is not in the current phase.** There is no delivery deadline (D27), so the reason
to hold the sequence is not schedule — it is that a phase built out of order is a phase whose acceptance
criteria nobody can honestly tick, and those criteria are the only definition of done this plan has. Say
so and confirm before proceeding.

## Workflow

### 1. Schema — `src/db/schema.ts`

- Every table: `school_id uuid NOT NULL REFERENCES schools(id)`, `created_at`, `updated_at`
- `snake_case` columns, plural table names
- Indexes on `school_id` and every foreign key
- Unique constraints that express real business rules (e.g. `(event_id, profile_id)` on registrations)
- Generate the migration; **read the generated SQL before applying it**

### 2. RLS policy — `src/db/rls/<table>.sql`

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY <table>_tenant_isolation ON <table>
  USING (school_id = current_school_id());
```

Then add role-specific policies for write access. For an append-only table (`xp_ledger`), grant INSERT
and **revoke UPDATE and DELETE from every role, including admins**.

**This step is second for a reason.** A policy written after the queries gets written *around* the
queries — it ends up permitting whatever the code already does rather than what the rules allow.

### 3. Zod contract — `src/features/<feature>/schema.ts`

Request and response schemas, exported types, shared between the handler and the client. No `any`
crosses this boundary.

### 4. Service — `src/features/<feature>/service.ts`

All business logic. Throws domain errors from `src/lib/errors.ts`. **Knows nothing about HTTP.** Uses
`src/lib/db/client.ts` (anon + RLS). Reaching for `db/admin.ts` requires a comment explaining why — it
is almost always the wrong answer.

### 5. Handler — `src/app/api/v1/<path>/route.ts`

Thin and identical in shape every time:

```ts
authenticate → authorize(role) → schema.parse(body) → service.doThing() → map errors
```

No business logic. Both web and native call this — there is no Server Action alternative (CLAUDE.md R3).

### 6. UI — `src/features/<feature>/components/`

Server Components by default. TanStack Query for data. Every string through `next-intl`. Then run
`hiraya-design-system`.

### 7. Tests

- Unit: business rules in the service
- Integration: **the cross-tenant denial case**, plus any unique constraint
- E2E: the user-visible path, if it is part of the core loop

## Outputs

1. A working vertical slice
2. Migration + RLS SQL, both reviewed
3. Tests including cross-tenant denial
4. **A named list of which agents this diff requires** (see below)

## Validation before considering it done

- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] Every new table has `school_id`, RLS enabled, and a policy
- [ ] A user from school A cannot read the new rows from school B — tested, not assumed
- [ ] Every handler Zod-parses its input
- [ ] No `db/admin.ts` import outside its allowlist
- [ ] No bare string literals in JSX
- [ ] Requirement IDs from `docs/PRD.md` are referenced in the commit message

## Which agents this diff requires

| If the diff touches | Run |
|---|---|
| Any new table or query path | `hiraya-tenancy-auditor` |
| PII, exports, analytics, forum | `hiraya-privacy-auditor` + `/security-review` |
| QR, check-in, XP | `hiraya-checkin-integrity` skill, then `hiraya-offline-scenario-tester` |
| Anything an adviser must do | `hiraya-adviser-advocate` (blocking) |
| User-facing UI | `hiraya-design-system` then `hiraya-mobile-audit` |

End by running `hiraya-checkpoint` if the slice completes a feature.
