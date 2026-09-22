# Contributing to Hiraya

For anyone joining the project, and for whoever inherits it next. Work through this page in order — the
setup at the bottom takes about twenty minutes, and the reading above it is what stops a well-meaning PR
from breaking something that cannot be seen in a diff.

**You do not need a Supabase account, a deployment, or any of the project's keys.** Everything runs
locally against synthetic data. That is deliberate, and §5 explains why.

---

## 1. The first hour

Read these, in this order. Nothing else is required before your first PR.

| # | Read | Why |
|---|---|---|
| 1 | [`README.md`](README.md) | What the product is, in five minutes |
| 2 | [`CLAUDE.md`](CLAUDE.md) §1, §3, §6 | The loop, the eight architecture rules, and the privacy rules. **§3 and §6 are the ones a PR gets rejected over** |
| 3 | [`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md) §2, §4 | The vocabulary, and the seven-step order every slice is built in |
| 4 | [`docs/WORKSTREAMS.md`](docs/WORKSTREAMS.md) | The lanes, the board, what is open and what it depends on |
| 5 | [`src/db/README.md`](src/db/README.md) | The schema, migration and RLS workflow. Required before your first migration |
| 6 | [`docs/PROGRESS.md`](docs/PROGRESS.md), newest two entries | What the last sessions actually did, and what they flagged as unresolved |

Then skim `docs/SYSTEM_DESIGN.md` §5 (the API contracts you will be implementing) and
`docs/TECHNICAL_ARCHITECTURE.md` §2 (the decision register — D18 through D32 are the live ones).

**The one sentence that explains the rest of the rules:** *a point in Hiraya means a teacher confirmed
you were there.* Leaderboards, badges and the Co-curricular Record are worthless the moment that claim
is falsifiable, so a change that trades verification for convenience is wrong even when it is
convenient.

---

## 2. Local setup

You do **not** need a Supabase account, and you will not be given the project's keys. Everything runs
against a local Postgres with synthetic data. This is deliberate — see §5.

**Prerequisites:** Node ≥ 20.11, Docker (or any local Postgres 17), git.

```bash
git clone https://github.com/jash-aeio/Hiraya.git
cd Hiraya
npm install
cp .env.example .env.local
git config core.hooksPath .githooks   # do not skip — see below
```

That last line installs `.githooks/pre-push`, which refuses a direct push to `main`. Git never installs
a repository's hooks by itself, so this is opt-in by design and the one setup step nothing will remind
you about. It matters more here than it would elsewhere: **server-side branch protection is
unavailable** on this repository — GitHub gates both classic protection and rulesets behind a paid plan
for private repos, and this one stays private until the Gate B transfer (D17, D26). The hook is a
reminder, CI is the enforcement.

Start a local Postgres with two databases — one to develop against, one for the integration suite to
write fixtures into and toggle RLS on:

```bash
docker run -d --name hiraya-pg -p 54322:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hiraya postgres:17
docker exec hiraya-pg psql -U postgres -c "CREATE DATABASE hiraya_test"
```

Then edit `.env.local`. Only these matter for local work:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/hiraya
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/hiraya_test
LRN_HMAC_PEPPER=local-dev-pepper-at-least-32-bytes-long
HIRAYA_DEMO_SCHOOLS=halimbawa-demo

# Placeholders. The Data API is disabled (D22), so nothing here reaches a table;
# they exist because modules read them at import. Never ask for the real values.
NEXT_PUBLIC_SUPABASE_URL=https://local.invalid
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-placeholder
SUPABASE_SERVICE_ROLE_KEY=local-placeholder
```

`QR_SIGNING_PRIVATE_KEY` and `QR_SIGNING_PUBLIC_KEY` stay empty until Phase 3, and the private half
never leaves the maintainer's environment (R5).

Bring the database up and confirm the invariants landed:

```bash
npm run db:migrate      # migrations AND RLS policies, in that order — never one without the other
npm run db:verify-rls   # asserts RLS is on and FORCEd, school_id indexed, no ledger UPDATE/DELETE grant
npm run db:seed:demo    # the synthetic tenant: 44 people, 6 orgs, 12 events
npm test                # the full suite, including cross-tenant denial
npm run dev             # then open /demo and pick a persona
```

If `npm test` is not green on a clean clone, stop and say so — that is a `main` problem, not a you
problem.

### Seeing a screen whose endpoint does not exist yet

Lane P builds a screen upward from a merged contract while Lane D builds the endpoint downward from the
same file (`docs/WORKSTREAMS.md` §2), so for a few days the screen exists and the route does not. Set

```bash
NEXT_PUBLIC_HIRAYA_FIXTURES=on
```

in `.env.local` and those screens render from a local fixture instead of failing. Unset — the default,
and what CI and every deployment use — they show their failure state, which is the truth until the other
lane lands its half. Several take a `?preview=` parameter to choose which state to show; each
`components/fixtures.ts` header lists its own. **The whole mechanism is deleted by task P-07**: a
fixture path that outlives the endpoint it stood in for is a second source of truth for what the API
returns.

### If the tests refuse to run

`TEST_DATABASE_URL equals DATABASE_URL` means you pointed both at the same database. The suite writes
fixtures and disables RLS mid-test; it will not do that to a database that could hold anything real.
Use two, as above. `ALLOW_DESTRUCTIVE_TESTS=1` exists for CI and is the wrong answer locally.

---

## 3. Finding work

[`docs/WORKSTREAMS.md`](docs/WORKSTREAMS.md) has the task board. §0 — "You are here" — is the fastest
way to see what is open right now.

**Claim any task in any lane** whose dependencies have merged and whose Owner column is `—`. Say which
one you are taking before you start, and put your handle in the Owner column in the same PR. The three
lanes are:

| Lane | Work | Start here if |
|---|---|---|
| **Q — quality and docs** | Tests, documentation, accessibility sweeps, tooling | **You are new.** A mistake here cannot reach the database, and you still walk the whole loop: branch, PR, CI, merge |
| **P — product surface** | Screens, components, design system, i18n | You are comfortable in React and care about how things feel at 360px |
| **D — data and API** | Schema, RLS policies, services, endpoints | You have read `CLAUDE.md` §3 and §6 and `src/db/README.md` end to end. Lane D holds four of the eight architecture rules, and a mistake here is a cross-tenant read rather than a visual bug |

A lane is a default, not a fence — you may touch another lane's files, but say so in the PR description
and not in the same PR as your own lane's work.

Before writing a feature, load the `hiraya-feature-slice` procedure — it prescribes the order that makes
tenancy and validation impossible to forget: Drizzle schema → RLS policy → Zod contract → `service.ts` →
`/api/v1` handler → UI → tests. Writing the policy *after* the queries produces a policy that permits
whatever the code already does, rather than what the rules allow.

---

## 4. Branches, commits, and pull requests

Work lands on `main` through a pull request with green CI — no direct pushes.

Be clear-eyed about what holds that up. GitHub will not enforce it on a private repository on this plan
(§2), so the guarantee is three weaker things stacked: the `pre-push` hook you installed above, CI
running on every push and every PR, and this document. `--no-verify` defeats the first, which is
deliberate — the bypass should be something you typed on purpose, not something you drifted into.

```bash
git checkout -b feat/registration-api      # feat/ fix/ docs/ chore/
# ... work, committing freely as pieces land ...
git push -u origin feat/registration-api
gh pr create
```

- **Conventional commits**, scoped: `feat(events):`, `fix(rls):`, `docs:`. The scope is the feature
  folder or subsystem, not the file.
- **Commit freely; open the PR when the slice is coherent.** A PR that spans two lanes or two features
  is hard to review and harder to revert.
- **Never force-push a shared branch**, and never rewrite history on `main`.
- Squash-merge, so `main` reads as one commit per slice.

### The PR checklist

`.github/pull_request_template.md` carries this; it is here so you know why each line exists.

- [ ] `npm run lint && npm run typecheck && npm test` pass locally
- [ ] Any new table has its `src/db/rls/<table>.sql` policy **and** its fixture in
      `tests/integration/helpers/fixtures.ts`, in this same PR
- [ ] `npm run db:verify-rls` passes
- [ ] Every new endpoint Zod-parses its input at the boundary (R7)
- [ ] No new import of `src/lib/db/admin.ts` — and if there is one, the reason is in the D-table
- [ ] No LRN, name, section or email in any log line, error message or response below School Admin (R8)
- [ ] New user-facing strings go through `next-intl`, in **both** catalogues
- [ ] `.env.example` updated if a variable was added
- [ ] `hiraya-tenancy-auditor` run on the diff if it touches schema, policies or a new query path
- [ ] `/security-review` run if it touches auth, RBAC, tenancy, QR, or PII

The last two are not ceremony. The only reviewer on this project is the maintainer plus these agents,
and an auditor that watched the code being written has already accepted its assumptions — running it
against a finished diff is the whole point.

### Review

**The maintainer reviews every contributor PR.** Claude Code's own PRs squash-merge themselves once CI
is green (D32) — that grant applies to Claude working in the maintainer's session, not to contributors,
and not to Claude working in yours.

Review is not a formality here, because CI cannot see everything. What a human is looking for is in
[`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md) §6 — six checks, each catching a class of failure. The two
that matter most: does the file list match the task, and does a new table carry its policy *and* its
fixture in the same PR?

A PR that changes a rule in `CLAUDE.md` §3 or §6 does not get merged on a review — it gets raised as a
decision first, and if the decision goes the other way it is recorded in the
`docs/TECHNICAL_ARCHITECTURE.md` D-table with its trade-off.

---

## 5. What you must not do

Not style preferences. Each of these has a specific failure behind it.

1. **Never ask for, hold, or commit a real secret.** `SUPABASE_SERVICE_ROLE_KEY`, `LRN_HMAC_PEPPER`,
   `QR_SIGNING_PRIVATE_KEY`, or a production `DATABASE_URL`. The project runs locally without them by
   design, and keeping the processor boundary at one person is what keeps Gate B's data processing
   agreement simple.
2. **Never point any environment at real learner data.** There is none yet, and there will be none
   before Gate B. After Gate B, this line is the difference between a bug and a reportable breach.
3. **Never construct a database client outside `src/lib/db/client.ts` / `admin.ts`.** Lint bans the
   import; do not work around the ban. If a query returns nothing, it is almost always a missing policy
   or a missing claim, not a permissions problem you should solve with the admin client.
4. **Never add UPDATE or DELETE to `xp_ledger` or `audit_log`**, for any role, for any reason.
   Corrections are reversal rows. A new append-only table must `REVOKE` from `service_role` explicitly —
   Supabase's default privileges grant it everything on new tables, and `REVOKE … FROM PUBLIC` does not
   reach a named role.
5. **Never log PII.** `profile_id` only. Not to Sentry, not to `console`, not in an error message a user
   will see.
6. **No Server Actions.** `/api/v1` is the single data layer, because a Capacitor bundle cannot run them
   and two data layers means two authorization paths (R3, D1a).
7. **No photo uploads of learners, and no learner↔adult private messaging.** Both are permanently out of
   scope, not deferred (D13, §6).
8. **Never edit a past `docs/PROGRESS.md` entry.** Append a new one. The log is append-only for the same
   reason the ledger is.

If a task seems to require one of these, that is worth a conversation, not a workaround — say so before
you build it.

---

## 6. Keeping the docs true

Documentation here is load-bearing: it is how this survives being handed to a school's ICT club. The
`hiraya-checkpoint` procedure reconciles docs with what was actually built, appends a dated entry to
`docs/PROGRESS.md`, and pushes. Run it when a feature slice merges, a migration lands, a decision
changes, a risk materializes, or a phase or gate closes.

With more than one contributor, one addition: **each `docs/PROGRESS.md` entry names its author** on the
`Phase:` line. Merge conflicts in that file are always resolved by keeping both entries, newest first.

If the docs and the code disagree, say so in the PR rather than silently picking a side. A document set
that quietly contradicts itself is worse than one that flags the conflict, because trust in it decays
invisibly.

---

## 7. Working with Claude Code in this repo

Optional, but the repo is set up for it: six project skills in `.claude/skills/` and five agents in
`.claude/agents/`, catalogued in [`SKILLS.md`](SKILLS.md). `CLAUDE.md` is read automatically at the start
of every session and holds the rules above in enforceable form.
[`docs/BUILD_GUIDE.md`](docs/BUILD_GUIDE.md) describes the whole loop.

Start any session with **`/hiraya-next`** — it reads the board and the repository state and tells you
what is open, what is blocked, and the exact line to type next.

Then, by lane: `hiraya-feature-slice` before starting anything, `hiraya-checkin-integrity` for anything
touching QR, check-in or XP, `hiraya-design-system` and `hiraya-mobile-audit` for any screen, and the
`hiraya-tenancy-auditor` agent after any migration or new query path.
