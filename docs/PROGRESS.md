# Hiraya — Progress Log

Append-only. Newest entry first. **Never edit a past entry** — this log is append-only for the same
reason the XP ledger is: a record you can rewrite is a record nobody trusts.

Maintained by the `hiraya-checkpoint` skill. See `CLAUDE.md` §7 for the six triggers.

---

## 2026-09-21 — Supabase project live; schema and RLS applied to real infrastructure

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track

**Shipped**

- **The Supabase project exists and holds the schema.** Region Southeast Asia (Singapore), Postgres
  17.6. `npm run db:migrate` applied the 22-table schema and all 24 RLS files against it; `npm run
  db:verify-rls` reports clean — 22 tables, 67 policies, 2 append-only tables
- **Data API (PostgREST) disabled at project creation (D22).** Verified: `GET /rest/v1/profiles` with
  the anon key returns **503**, so PostgREST is not serving at all. `/api/v1` is now the only reachable
  data path in fact, not only by convention
- **Automatic RLS event trigger enabled.** `ensure_rls` is present on `ddl_command_end`, so a future
  table gets RLS whether or not its migration remembers. New-table auto-exposure left off
- `src/lib/db/admin.ts` **split into two entry points** — `withServiceRole(reason, fn)` (Drizzle
  transaction as `service_role`, for tables) and `adminAuthApi(reason)` (GoTrue `auth.admin` only,
  narrowed so `.from()` is unreachable *by type*). Reasons are validated per half. Nothing had called
  the old client yet, so the rewrite cost nothing
- `withServiceRole` issues `set local role service_role` rather than relying on the login role carrying
  `BYPASSRLS`. Confirmed against the project: `postgres` and `service_role` both hold `BYPASSRLS`, and
  both `set local role` paths work
- Full suite green on a real schema: **35 tests, 3 files**, including the 27 RLS integration tests

**Decisions**

- **D22** — the Supabase Data API is disabled; `anon`/`authenticated` keys serve Supabase Auth only.
  An exposed PostgREST is a second data layer whose safety rests on no policy ever being missed, which
  is the opposite of R3's argument. Off, a forgotten policy is a bug rather than a public leak.
  Accepted cost: no supabase-js table access anywhere, and the dashboard's table editor loses its
  API-backed features

**Docs updated**

- `CLAUDE.md` §3 R2 — documents the two admin entry points, the absence of supabase-js table access,
  and the `service_role` revoke that every future append-only table needs
- `docs/TECHNICAL_ARCHITECTURE.md` §2 — D22 added
- `.env.example` — records that the Supabase keys are auth-only, adds the admin pool size

**Risks**

- Materialized: **`service_role` held UPDATE and DELETE on `xp_ledger` and `audit_log`** — a direct R4
  violation, and the one privileged path in the application runs as exactly that role. Cause: Supabase's
  default privileges grant `service_role` everything on new tables in `public`, and the policy files'
  `REVOKE … FROM PUBLIC` does not reach a named role. Fixed by explicit `REVOKE UPDATE, DELETE, TRUNCATE
  … FROM service_role` in both files; verified at runtime that all four operations are now denied.
  **This class of bug is invisible locally** — `scripts/bootstrap-roles.sql` creates `service_role`
  without Supabase's default privileges, so the integration suite passed while production would not
  have. `db:verify-rls` against the real project is what caught it
- Retired: **repository visibility**, carried unconfirmed through the last two checkpoints.
  `jash-aeio/Hiraya` is confirmed `PRIVATE`. D17 holds

**Next**

- Supabase MCP server: `.mcp.json` is committed, read-only and pinned to project `zpdyybdqezkfiupobjaj`.
  Needs `SUPABASE_ACCESS_TOKEN` in the environment, then a Claude Code restart
- Phase 0 remainder: design tokens, Tier 1 SVG assets, the synthetic demo tenant with its DEMO DATA
  marker, deploy to a public URL, the pitch kit

**Flagged**

- **`TEST_DATABASE_URL` must stay unset on this machine.** It is commented out in `.env.local`; when
  set, the suite uses it instead of booting embedded Postgres, and pointing it at the real project
  would be a Gate B violation. `scripts/env.ts` asserts the database is disposable, but the safest
  state is unset
- The **QR Ed25519 keypair is still empty** in `.env.local`, deliberately — `src/lib/qr` does not exist
  until Phase 3 and will define the encoding
- Everything above ran against an **empty database**. No fixture, demo tenant, or learner row exists
  yet, so the cross-tenant denial test still proves itself only on the embedded Postgres the suite
  boots, not on the Supabase project
- **CONTRADICTION — the role list disagrees between docs and code, and the code is already enforcing
  its version.** `docs/PRD.md` §3 and `docs/SYSTEM_DESIGN.md` §2 both document **seven** roles
  (Learner, Org Officer, Org Adviser, SSLG Officer, Moderator, School Admin, Super Admin). The enum in
  `src/db/enums.ts` has **ten**, adding `sslg_adviser`, `guidance`, and `school_head` — and RLS
  policies already grant against all three (`src/db/rls/xp_ledger.sql` reads XP for `sslg_adviser`,
  `school_head`, `guidance`). `CLAUDE.md` §6 independently refers to guidance staff as a real role for
  non-participant analytics, which suggests the code is right and the two role tables are stale.
  **Not resolved here** — whoever fixes it must decide whether the capability matrix in
  `SYSTEM_DESIGN.md` §2 gains three columns or the enum loses three values, and that is a permissions
  decision, not an editing one

- Carried, unchanged: assumptions A1–A7 in `docs/PRD.md` §10 unverified; Apple Developer fee ownership
  undecided; R13 (Supabase pauses idle free projects after ~7 days) now **live** — this project will
  sleep between pitch meetings

---

## 2026-09-21 — Phase 0 week 1: skeleton, schema, and RLS in the first migration

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track

**Shipped**

- Next.js 16 + TypeScript strict + Tailwind 4 app; `/api/v1` route factory; `next-intl` catalogues in
  `en` and `fil` wired from the first screen. App boots, both locales render, `html lang` follows the
  locale cookie
- **22-table core schema** (`src/db/schema.ts`, migration `drizzle/0000_core_schema.sql`). Every table
  but `schools` carries `school_id uuid NOT NULL`, indexed. `checkins` unique on
  `(event_id, profile_id, jti)` — the idempotency key Phase 3 will lean on
- **RLS enabled and FORCEd on all 22 tables, 67 policies**, one `src/db/rls/<table>.sql` file per table,
  written before any query exists. `npm run db:migrate` applies schema and policies as one command, so a
  table cannot exist without its policy
- Triggers: `school_id` immutability on every table carrying one (attached by a loop, not a hand-kept
  list), append-only rejection on `xp_ledger` and `audit_log` that holds against the table owner, and
  column restriction on `profiles`
- `src/lib/db/client.ts` drops every transaction to the `authenticated` role with claims set for that
  transaction only, so RLS applies to our own queries; `admin.ts` confined, `server-only`, lint-banned,
  with three documented allowlist reasons. **Verified the ban fires** by importing it from a probe file
- `src/lib/errors.ts` (the §8 taxonomy), `src/lib/log.ts` (denied keys scrubbed, not merely documented)
- CI: lint → typecheck → migration check → migrate → `db:verify-rls` → tests → build, against a real
  `postgres:17` service container
- **35 tests pass.** Cross-tenant denial across all 21 tenant tables; a case that disables RLS and proves
  the leak appears; append-only ledger by grant *and* trigger; learner cannot self-check-in or
  self-award XP; unapproved events hidden; officer cannot self-approve

**Decisions**

- **D18** — check-in XP is written by a `SECURITY DEFINER` function, not by the scanning session; an
  officer session holds no `xp_ledger` INSERT path. Lands with the Phase 3 check-in slice
- **D19** — `xp_balances` is a regular view with `security_invoker = true`, **never** a materialized
  view: matviews cannot carry RLS policies, so one would be readable across schools
- **D20** — TypeScript pinned to 6.x, ESLint to 9.x. TS 7 is unsupported by `typescript-eslint` and
  ESLint 10 breaks `eslint-config-next`'s React plugin; either would have silently disabled `npm run
  lint`, and with it the only thing enforcing R2
- **D21** — column-level rules RLS cannot express are enforced by triggers, not by services alone,
  because `authenticated` is one role for learners and admins alike
- **D1 amended** — Next.js 16, not 15. Confirmed with the maintainer

**Docs updated**

- `docs/SYSTEM_DESIGN.md` §4 — `lrn_hmac` moved off `profiles` to a new `profile_identifiers` row;
  `org_advisers` added (it was in the ER diagram but missing from the table list); `event_approvals`
  note records the split INSERT policy; `xp_balances` corrected from materialized view to
  `security_invoker` view; ER diagram and two Mermaid labels updated
- `docs/TECHNICAL_ARCHITECTURE.md` — D1 and the stack table to Next 16; D18–D21 added; `embedded-postgres`
  in the testing row; new risk row for toolchain-versus-lint-plugin drift
- `docs/DATA_FLOW.md` — LRN row names the separate table; archival erases the whole identifiers row
- `docs/MILESTONE_ROADMAP.md` — Next 16; the cross-tenant denial acceptance criterion ticked
- `CLAUDE.md` §6, §8 — LRN storage location and its reasoning; `db:check` and `db:verify-rls` added to
  the command table, `db:migrate` documented as applying RLS too
- `README.md` — status, Next 16, and a Development section; `src/db/README.md` added (schema and policy
  workflow, and how to add a table without losing test coverage)

**Risks**

- Materialized: **none.** One avoided rather than materialized — a materialized `xp_balances` would have
  been a cross-tenant read path (D19), caught while writing the schema rather than in Phase 3
- Newly identified: **R17** the toolchain's newest versions break the lint chain that enforces R2, so a
  routine `npm update` can disable a security control quietly. Mitigated by D20's pins and by lint being
  a required CI step
- Retired: none

**Next**

- Design tokens and primitives per `docs/DESIGN_SYSTEM.md`, then Tier 1 assets per
  `docs/ASSET_CHECKLIST.md`
- Synthetic demo tenant with the DEMO DATA marker (`db:seed:demo` is declared but not yet written)
- Supabase project provisioning and a Vercel deploy — both need the maintainer's accounts
- First `hiraya-mobile-audit` once there is a screen worth auditing

**Flagged**

- **No Supabase project exists yet.** Everything above was migrated and tested against a local Postgres
  the integration suite boots itself. The schema and policies have never run on Supabase, where `postgres`
  is not a superuser and `anon`/`authenticated`/`service_role` already exist — expect small surprises on
  first apply, particularly around `FORCE ROW LEVEL SECURITY` and seeding as the owner
- **`resolveSession` returns null.** Every guarded endpoint answers 401 by design until the Phase 1
  identity slice lands. The rule that must survive that work: claims come from the verified token, never
  from a request body
- **Two rules remain with the service layer and cannot move into RLS.** That an adviser may not approve
  an event they drafted themselves (needs two rows compared), and which columns each role may change
  beyond the `profiles` trigger. Re-run `hiraya-tenancy-auditor` when `src/features/*/service.ts` exists
- **A refused UPDATE under RLS does not raise.** A `USING` clause removes the row from reach, so the
  statement succeeds having changed nothing. Every service must check the affected-row count rather than
  treat a resolved promise as proof of a write. One test records this
- `test:e2e`, `cap:sync` and `cap:android` are declared in `package.json` but not yet wired; Playwright
  arrives with the first walkable loop, Capacitor in Phase 5
- First-load JS is **≈183 KB gzipped** on an almost empty page — inside the 500 KB budget with ~317 KB of
  headroom, but that is the floor before any feature ships. The whole `next-intl` catalogue is serialized
  into the RSC payload; worth revisiting if the catalogues grow
- Phase 0 acceptance criteria still open: demo tenant on a phone under 3s, the walkable loop, the 500 KB
  budget measured via `browser_network_requests`, WCAG AA on every demo screen
- Repository visibility **still unconfirmed as private** (carried from the last checkpoint). D17 assumes it

---

## 2026-09-21 — Planning set complete

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track (documentation complete,
implementation not started)

**Shipped**

- Repository initialized; remote `github.com/jash-aeio/Hiraya` connected; `main` branch
- Complete planning set: `CLAUDE.md`, `SKILLS.md`, and seven documents under `docs/`
- Five project skills under `.claude/skills/`
- Five project agents under `.claude/agents/`
- `.gitignore` with the never-commit list enforced from the first commit

**Decisions** — D1–D17 recorded in `docs/TECHNICAL_ARCHITECTURE.md` §2. The four that shape the most:

- **D1a** — `/api/v1` is the single data layer; **no Server Actions**. Forced by D11: a Capacitor bundle
  cannot run Server Actions or RSC. Costs Server Action ergonomics and form progressive enhancement;
  buys one authorization path instead of two, which is the trade that matters for minors' data
  maintained by one person.
- **D11** — Capacitor wrapper: one codebase → web PWA + Android + iOS. Native camera is what the ≥15
  check-ins/min KPI actually depends on.
- **D8 / D17** — school is data controller, developer is processor; repository and infrastructure
  transfer to school ownership is a **Gate B deliverable**, not an intention.
- **D12** — dual visual register on shared tokens. Learner surfaces playful, adviser/admin surfaces calm.

**Docs updated** — all created this checkpoint.

**Risks**

- Materialized: none yet.
- Newly identified beyond the original proposal's ten: **R13** Supabase pauses idle free projects (~7
  days) — the demo tenant will sleep between pitch meetings; **R14** app-store rejection under
  child-directed policies (Play Families, Apple Kids); **R16** Apple's annual developer fee is not in the
  ₱15,400 pilot budget.

**Next**

- Phase 0 build: Next.js 15 + Supabase skeleton, RLS from the first migration, design tokens, Tier 1
  assets authored as SVG, synthetic demo tenant with the DEMO DATA marker, deploy to a public URL,
  assemble the pitch kit.

**Flagged**

- **Repository visibility must be confirmed private** before any further push. D17 assumes it.
- Three proposal delimitations are deliberately **superseded**, recorded in `docs/PRD.md` §4: PWA-only
  delivery (now web + native), the academic evaluation apparatus (this is a personal project, not a
  thesis — §13 targets survive as product KPIs), and the working title *Kasali*.
- Assumptions A1–A7 in `docs/PRD.md` §10 are **unverified**. A1–A3 (device access, venue connectivity,
  officer device capability) need the school's own survey at Gate A. Design choices depend on them.
- Apple Developer fee ownership is undecided and blocks Phase 5 iOS. Android-only ships if unresolved.
- No application code exists yet. Nothing in `docs/` has been validated against a running system.
