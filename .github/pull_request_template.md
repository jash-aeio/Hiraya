<!--
Why this template exists: the only reviewers on this project are one maintainer
and five agents. These boxes are the checks that cannot be seen in a diff.
Delete any section that genuinely does not apply — do not tick it blindly.
CONTRIBUTING.md §4 explains each line.
-->

## What this changes

<!-- One paragraph. Name the WORKSTREAMS task id (D-01, J-02, …) if there is one. -->

**Task:** <!-- D-## / P-## / J-## / none -->
**Lane:** <!-- D (data and API) · P (product surface) · joint -->
**Touches the other lane's files?** <!-- no / yes, and why it could not be split -->

## Always

- [ ] `npm run lint && npm run typecheck && npm test` pass locally
- [ ] New user-facing strings go through `next-intl`, in **both** `en.json` and `fil.json`
- [ ] `.env.example` updated if a variable was added, with a comment on what breaks when it is unset
- [ ] No PII in any log line, error message, or response below School Admin (R8)

## If this touches the database

- [ ] Every new table carries `school_id`, indexed, with its `src/db/rls/<table>.sql` policy **in this PR**
- [ ] Its fixture is in `tests/integration/helpers/fixtures.ts` **in this PR** — the cross-tenant test
      enumerates tables from the live schema and fails on an unseeded one
- [ ] `npm run db:verify-rls` passes
- [ ] No UPDATE or DELETE grant added to `xp_ledger` or `audit_log`, for any role; any new append-only
      table `REVOKE`s from `service_role` explicitly
- [ ] Only one migration is open repo-wide (WORKSTREAMS §3)
- [ ] `hiraya-tenancy-auditor` run on this diff — paste the result

## If this touches an endpoint

- [ ] Input Zod-parsed at the boundary from `features/<f>/schema.ts` (R7); no `any` crosses it
- [ ] Business logic is in `service.ts`; the handler is thin and maps errors in one place
- [ ] Claims come from the verified session, never from the request body
- [ ] No new import of `src/lib/db/admin.ts` — or the new `AdminReason` is recorded in the D-table

## If this touches auth, RBAC, tenancy, QR, or PII

- [ ] `/security-review` run — findings resolved or explicitly accepted here
- [ ] `hiraya-privacy-auditor` run if it touches PII, exports, analytics, or the forum

## If this touches the scanner, the queue, or `/checkins/sync`

- [ ] `hiraya-offline-scenario-tester` run: queue, replay, clock skew, duplicate scan, mid-sync
      disconnect, capacity race
- [ ] Replaying the full queue produces **zero** duplicate XP

## If this touches user-facing UI

- [ ] `hiraya-mobile-audit` run: 360×800, WCAG 2.1 AA via the a11y tree, first load ≤ 500 KB

## Docs

- [ ] `docs/WORKSTREAMS.md` task struck if this closes one
- [ ] A decision that a future session would otherwise re-litigate is in the
      `docs/TECHNICAL_ARCHITECTURE.md` D-table
- [ ] `docs/PROGRESS.md` entry appended if this is a checkpoint trigger (CLAUDE.md §7) — never edit a
      past entry
