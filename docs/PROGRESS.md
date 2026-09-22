# Hiraya — Progress Log

Append-only. Newest entry first. **Never edit a past entry** — this log is append-only for the same
reason the XP ledger is: a record you can rewrite is a record nobody trusts.

Maintained by the `hiraya-checkpoint` skill. See `CLAUDE.md` §7 for the six triggers.

**With more than one contributor** (D26, D31): every entry names its author on the `Phase:` line, and anyone may append.
A merge conflict here is always resolved by **keeping both entries, newest first** — never by choosing
one. An entry that describes only one lane's work is fine and expected; an entry that quietly drops
another lane's is the failure this file exists to prevent.

---

## 2026-09-22 — The plan, rewritten for a maintainer who is learning and for contributors who are not here yet

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

No product code changed. This entry is about the documentation and the working agreement, both of
which had drifted from how the project is actually being built.

**Shipped**

- **`docs/BUILD_GUIDE.md` — new, and the centre of this change.** The process document the repo did
  not have: the loop (prompt → slice → agents → PR → CI → merge → checkpoint), a vocabulary table
  defining every term the other documents use without explaining, the three ways to start work and
  which is right when, the seven-step slice order with the reason each step sits where it does, six
  concrete PR checks for a reviewer who cannot read every line, a debugging ladder, and a per-phase
  learning path. It keeps the technical vocabulary rather than routing around it — the maintainer will
  be the one answering a DPO's questions, and "explain this to me" is part of the build, not a detour
- **`docs/SETUP_GUIDE.md` — new.** Every maintainer-only task in one place, marked blocking / phased /
  done, with what each is for and what breaks if it is skipped: the machine, the four secrets and how
  to generate them, Supabase (including the setting that must never be re-enabled), Vercel with the
  exact environment variables, rotation, inviting contributors, Gate A, Gate B, store accounts, and
  backup-restore. `WORKSTREAMS.md` §4 and the `hiraya-next` report both cite it by section
- **`docs/WORKSTREAMS.md` §0 — "You are here".** Current phase, last commit on `main`, what is in
  flight, what is blocked on the maintainer, and the next four actions each with the literal line to
  type. Owned solely by `/hiraya-checkpoint`; when it disagrees with the tables, the tables win
- **`/hiraya-next` — a sixth project skill.** Reads `git log main`, open PRs, the board and the phase's
  unticked criteria, reconciles them against §0, sorts every open task into WAITING / BLOCKED ON YOU /
  NEXT / QUEUED, and ends with one literal `→ Type:` line. At most three tasks under NEXT, because
  more than three is the menu this skill exists to replace
- **Three lanes instead of two (D31).** Lane D and Lane P become *kinds of work* any contributor can
  claim, plus a new **Lane Q** (tests, docs, accessibility, tooling). Every task table gained an Owner
  column, empty until claimed. `CONTRIBUTING.md`, `README.md` and `CLAUDE.md` §7 follow
- **Standing permissions written into `CLAUDE.md` §11 (D32)**, so they are inherited rather than
  re-negotiated each session: commit/push/PR, local database commands, Supabase writes via MCP, and
  self-merge on green CI. `.mcp.json` drops `--read-only` accordingly
- **Dependency audit** — see Flagged. Nothing upgraded

**Decisions**

- **D31** — the two fixed lanes of D26 become three claimable ones. D26 hard-coded two people into
  every task table, which made a third contributor a document rewrite rather than an invitation. The
  lane *mechanism* was never about headcount. Lane Q exists because the previous split had no safe
  entry point: a newcomer's first task was either a screen or an RLS policy, and one of those can
  produce a cross-tenant read
- **D32** — four standing permissions. Three are cheap and reversible. **The fourth, self-merge on
  green CI, removes the only human review step the project had** and was taken knowingly after being
  flagged: CI catches typecheck, lint (the R2 import ban), cross-tenant denial and migration
  consistency, and catches nothing about product judgement. `BUILD_GUIDE.md` §6 is what now stands in
  that gap. The Supabase write grant is scoped to a pre-Gate-B project holding only synthetic data

**Docs updated**

- `docs/TECHNICAL_ARCHITECTURE.md` — D31 and D32 added; D3, D26 and §11 amended to match
- `docs/MILESTONE_ROADMAP.md` — a "how to use this document" preamble naming the four documents and
  how to prompt a phase; R22 and R23 added; Gate B gained the D32 re-decision item; two-developer
  language generalized
- `docs/WORKSTREAMS.md` — rewritten to v2.0: §0, three lanes, Owner columns, a claiming procedure,
  Phase 1 gained three Lane Q tasks and a "good first task" note, the dependency graph redrawn
- `CLAUDE.md` — §2 structure, §7 three lanes, §9 the new skill, §10.2 start with `/hiraya-next`,
  §11 the standing-permission block
- `CONTRIBUTING.md` — opens to any contributor; lane-choosing table with Lane Q as the entry point;
  review section states who reviews what now
- `README.md`, `SKILLS.md` — new documents linked, counts and status corrected
- `.claude/skills/hiraya-checkpoint/SKILL.md` — now owns §0 and checks it against `git log` and
  `gh pr list`; `BUILD_GUIDE.md` and `SETUP_GUIDE.md` added to its mapping table

**Risks**

- Newly identified: **R22** — a moderate `esbuild` advisory reaches the repo through
  `drizzle-kit → @esbuild-kit/*`. Dev-dependency only, and the advisory concerns an esbuild dev server
  this project never runs. The only offered fix downgrades `drizzle-kit` to 0.18.1, a breaking change
  to the tool that generates every migration — strictly worse than the exposure. Accepted, re-checked
  each `drizzle-kit` minor
- Newly identified: **R23** — a standing permission outlives the conditions that made it safe. D32 was
  reasoned against a project holding only synthetic data. Mitigated by writing the expiry condition
  into `CLAUDE.md` §11 and onto the Gate B checklist rather than holding it in memory
- Materialized: none. Retired: none

**Next**

- ~~Merge **PR #10** then **PR #11**~~ — both landed in this same session (`904f6d0`, `1e6bd1f`).
  #11 needed a `docs/PROGRESS.md` conflict resolved by the documented rule: keep both, newest first
- **P-07** — delete the fixture seam (newly booked; it was previously an unnumbered note)
- **M-01** — Supabase and Vercel. Now partly unblocked: with `--read-only` dropped, the schema can be
  applied without hand-running SQL, once the maintainer sets `SUPABASE_ACCESS_TOKEN` and restarts

**Flagged**

- **`.mcp.json` will not take effect until Claude Code restarts**, and needs `SUPABASE_ACCESS_TOKEN`
  in the maintainer's shell. Until both are done, M-01 is still a manual dashboard task
- **Dependency audit, reported not applied.** Five safe patch bumps available: `@supabase/supabase-js`
  2.116→2.117, `drizzle-orm` 0.45.2→0.45.3, `drizzle-kit` 0.31.10→0.31.11, `next-intl` 4.14.5→4.14.6,
  `dotenv` 18.0.1→18.0.3. **`eslint` 10 and `typescript` 7 are deliberately pinned by D20 and must not
  be bumped** — either would silently disable `npm run lint`, and with it the import ban that is the
  only thing enforcing R2. Deferred on purpose: upgrading while two PRs are open produces a red CI
  nobody caused
- **`WORKSTREAMS.md` §0 is accurate as of this commit and will be wrong the moment a PR merges.** That
  is the cost of the block and the reason `/hiraya-next` reports reality over it when they disagree

---

## 2026-09-22 — Lane D's half of Phase 0, and two holes on the scan path

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

**Shipped**

- **D-01 through D-05 — the whole Lane D critical path.** Seven endpoints: `GET /events/:id`,
  `POST`/`DELETE /events/:id/register`, `GET /events/:id/roster`, `POST /checkins`,
  `GET /checkin/events`, `GET /me/xp`, `GET /leaderboard`. Every screen's fetch URL already matched
  one, which is the two-lane handshake (`WORKSTREAMS.md` §2) working exactly as designed — neither
  lane had anything to renegotiate at the end
- **Capacity is settled in SQL, not in a service.** `public.register_for_event` counts and writes
  behind `SELECT ... FOR UPDATE` on the event row; `public.cancel_event_registration` promotes the
  head of the waitlist and renumbers the rest in the same transaction. Proven rather than asserted:
  two learners race one seat and exactly one gets it, ten race four and the cap holds with the
  waitlist coming out 1..6
- **`public.award_checkin_xp` is the D18 bridge `xp_ledger.sql` promised.** It takes a check-in id
  rather than a profile and an amount, re-states the check-in INSERT policy, and awards at most once
  per learner per event under the event lock. An officer's session still has no other INSERT path
  into the ledger
- **Non-negotiable test 2 passes.** A 40-scan queue replayed twice, in both orders, produces zero
  duplicate XP (`tests/integration/checkin-xp.test.ts`)
- **The board's two FR-5.8 rules are SQL, not rendering.** A hidden learner is absent from the rows
  and still sees their own rank, and ranks are computed over the *visible* population — ranking over
  everyone and dropping the hidden rows would leave a gap that announces both that somebody is
  hidden and roughly what they scored
- **235 tests green**, up from 170. `npm run build` compiles all seven routes

**Decisions**

- **D28** — a leaderboard row publishes display name, avatar, **grade level, section**, XP, rank and
  level title, school-wide; org boards are readable by anyone in the school. Raised by
  `hiraya-privacy-auditor` against `DATA_FLOW.md` §1 and confirmed by the maintainer. This is the
  widest publication of learner attributes in the product and is the one to re-examine with the
  school's DPO before Gate B
- **D29** — a check-in against an event that is not `approved` writes attendance and awards nothing
- **D30** — a scan's claimed time is bounded by *server* time as well as by the event window

**Docs updated**

- `docs/TECHNICAL_ARCHITECTURE.md` — D28, D29, D30 added
- `docs/DATA_FLOW.md` §1 — the leaderboard Outputs row now states what a board actually publishes
- `docs/SYSTEM_DESIGN.md` §8 — `EVENT_NOT_APPROVED` added; `SCAN_OUTSIDE_EVENT_WINDOW` now says
  which half of its behaviour exists in Phase 0 and which waits for Phase 3
- `docs/WORKSTREAMS.md` §5 — D-01…D-05 struck with what each landed; the critical path closed; the
  fixture seam named as the one task between here and the walkable loop

**Risks**

- Materialized: **two authorization holes on the scan path, both found by `/security-review`, both
  fixed in `ca0ab9d`.** (1) Nothing required an event to be *approved* before a scan could mint
  points — and an Org Officer **is a learner**, who can file a proposal, have an adviser reject it,
  and still hold the grant that writes attendance for their own org. That gap was the approval
  control itself, not the colluding-officer risk T2 already accepts. (2) The scan window compared
  `scanned_at` only against the event's own start and end, which made the rule circular: a time
  inside the window of an event that finished last term passed *because* it was inside that window,
  so attendance could be backdated into any past event
- Newly identified: **R21 — a SECURITY DEFINER function whose owner does not bypass RLS reads under
  the *caller's* policies while believing it reads above them.** Every tenant table is FORCE ROW
  LEVEL SECURITY, and FORCE applies to the owner too. The failure is silent and it under-reads:
  `public.leaderboard` would rank a learner against nobody, and `register_for_event` would count a
  full event as empty and overbook it. Locally the owner is a superuser, so nothing notices.
  `db:verify-rls` now fails CRITICAL on it, which is what M-01 will actually test
- Retired: none

**Next**

- **The fixture seam** — `src/lib/fixtures.ts` and the four `components/fixtures.ts` beside it.
  Lane P, and it must land after P-06 merges because it touches the same files
- **M-01** — apply to Supabase and deploy. Both of its dependencies (D-05, P-06) are now done
- Phase 0's walkable-loop criterion closes with those two, in that order

**Flagged**

- **`hiraya-tenancy-auditor` returned CLEAN twice** (once on D-01, once on D-02…D-05) and
  `hiraya-privacy-auditor` found nothing critical — but `/security-review` still found two real
  authorization holes that both agents had read past. Three passes over the same diff found three
  different things. Worth remembering before treating any single clean audit as sufficient
- **The seed had a silent bug and nothing failed.** `eligibility_json` was double-encoded
  (`JSON.stringify` into a jsonb parameter that postgres.js then serialized again), so the
  Senior-High-only demo event admitted the whole school. It was caught only because
  `register_for_event` now *raises* on a malformed rule rather than reading it as "no rule". The
  fail-open version would have shipped
- **R21 is untested against the database where it matters.** Everything in this entry ran against a
  local Postgres whose owner is a superuser. Supabase's `postgres` is not one, and whether it holds
  BYPASSRLS decides whether three functions work correctly there. **Run `npm run db:verify-rls`
  against Supabase at M-01 before anything else** — if it fires, the fix is to own these functions
  with a role that holds BYPASSRLS, never to drop FORCE
- **XP is not granted retroactively** when an event is approved after a scan. Nothing re-runs the
  award. Phase 2 has to decide whether anything should
- **The flaky test file persists**, and now has a shape: it fails at *file* level (suite setup),
  never on an assertion, and passed on every re-run. Consistent with the embedded-Postgres startup
  rather than with anything under test
- **`GET /events/:id/roster` inherits its safety entirely from a policy this work did not touch**
  (`event_registrations_select_self_or_hosts`). Noted by the privacy audit: the roster is safe, but
  nothing in this slice re-proves the thing it rests on
- **This branch will conflict with PR #10 in `docs/PROGRESS.md`.** That is expected and the
  resolution is the documented one: **keep both entries, newest first** — never choose one

---

## 2026-09-22 — P-06: the audit the last session could not run

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

**Shipped**

- **`hiraya-mobile-audit` actually ran**, on a production build at 360×800, across **14 routes**: the
  four Lane P screens and every `?preview=` state they carry, the events list in both scopes, the gate
  picker, the persona picker, home and `/design`. This is the browser walk P-04 merged without, and the
  last session's blocker — no MCP browser — is retired
- **The 500 KB budget is ticked, from the browser rather than from the build.** **200–209 KB per route**
  encoded, heaviest `/demo` and `/design` at 208.8 KB. The last checkpoint could only infer this from
  `next build` output and left the box unticked on purpose; the criterion names
  `browser_network_requests`, and that is now what measured it
- **Two WCAG AA failures found and fixed.** `text-primary` (#0d7f7c) at 13px on `--color-canvas` is
  **4.44:1**, under the 4.5:1 floor — two back links sat there, "All events" across all five event-detail
  states and "All gates" on the gate. Both now use `--color-primary-ink` (8.5:1). And the officer gate
  had **no `h1`**: its heading order began at `h2 "Roster"`
- **The gate now names itself.** Fixing that `h1` surfaced something worse than the a11y failure: the
  scanner screen **never showed which event it was scanning for**. `listRosterResponseSchema` returns
  `eventId` and no title, so an officer running one of two concurrent events had nothing on screen to
  check against — and scanning into the wrong gate is the exact correction the XP screen already
  renders. The title comes from `GET /checkin/events`, whose `scannableEventSchema` already carries it
- **Everything else in sections 2–5 passed**, and was measured rather than eyeballed: no horizontal
  scroll at 345px on any route, no element wider than the viewport, every interactive target ≥44×44
  (the `/design` checkboxes read as 20px but their `<label>` wrapper is the 44px target), a visible
  focus ring on all 41 focusable elements across five screens, every control named, no `img` without
  `alt`, no unlabelled `svg`, live regions present on every screen
- **Both locales walked.** The Filipino catalogue is **full — 299 keys, matching English exactly** — and
  every Phase 0 screen renders in it with no overflow and no truncation at 360×800

**Decisions**

- No new D-number. Three calls were taken and recorded where they were made: the scanner reads its
  title from `/checkin/events` **rather than adding `eventTitle` to `listRosterResponseSchema`**,
  because J-01 is merged and D-01 is being built against that file right now — two requests on a screen
  that opens once per event is the cheaper half of that trade; the `--color-primary` restriction is
  written into `tokens.css` and `DESIGN_SYSTEM.md` §2 and §8 rather than fixed only at the two call
  sites; and **P-14 is booked rather than built** (below)
- **D6 is overtaken and now says so.** It reads "Filipino locale in Phase 2"; both catalogues are
  already full and the audit walked every screen in Filipino. What is actually missing is the
  *switcher* — nothing but `src/i18n/request.ts` reads `HIRAYA_LOCALE`, so Filipino is reachable only
  by setting a cookie by hand

**Docs updated**

- `docs/MILESTONE_ROADMAP.md` — the 500 KB criterion ticked with its measurement; the WCAG AA criterion
  left **unticked** and annotated with what was fixed and what is open
- `docs/WORKSTREAMS.md` — P-06 struck with its findings; **P-14 added to Phase 1** (the bottom tab bar)
  with a note on why it was deferred; §5's open-criteria line updated
- `docs/DESIGN_SYSTEM.md` §2 and §8 — `--primary` as text is white-surface-only; `--primary-ink` is the
  canvas one
- `docs/TECHNICAL_ARCHITECTURE.md` — D6 marked overtaken
- `src/design/tokens.css`, `src/i18n/request.ts` — the same two corrections at the point of use

**Risks**

- Materialized: none new
- Retired: **"no MCP browser was reachable"**, the risk the last entry logged. Playwright connected and
  the full sweep ran
- Still open, unchanged: the test suite that failed once in five local runs. It passed here (170/170),
  which the last entry already warned is not proof

**Next**

- **D-01**, still the head of the critical path and still owing three endpoints. Every Lane D task in
  the Phase 0 table is unblocked
- **M-01** — P-06 was one of its two dependencies; the other is D-05
- The **fixture seam deletion** with D-01…D-04

**Flagged**

- **WCAG AA is deliberately still unticked**, on one finding: **no `nav` landmark on any screen, because
  there is no navigation between screens at all**. A learner on `/xp` reaches `/events` only by typing a
  URL. `DESIGN_SYSTEM.md` §7 specifies a five-item bottom tab bar, but **two of those five (Orgs, Me)
  are Phase 1 screens that do not exist**, so a Phase 0 tab bar would be built twice. Booked as **P-14**.
  A future session must not read the two green fixes as the criterion being met
- **The `?preview=` states are fixture data, and the event-detail route ignores its own id** —
  `/events/<any real id>` renders the fixture event. That is the seam working as designed, but it means
  this audit measured the *screens*, not the screens-on-real-data. The walk is worth repeating once
  D-01…D-04 land and the fixtures are deleted
- **The scanner's title lookup costs a second request** that Phase 3 may want to fold into the roster
  read anyway. If D-01 has not shipped `GET /events/:id/roster` yet, adding `eventTitle` there is still
  the cheaper long-run shape — it was avoided now for lane reasons, not design ones
- **No locale switcher exists.** Full Filipino catalogue, no way for a learner to choose it
- **`next-env.d.ts` flips** between `.next/dev/types/` and `.next/types/` depending on whether the last
  command was `next dev` or `next build`. Kept on the dev paths; a session that runs a build will see it
  dirty again
- Unchanged: the OG card's typeface; no Supabase apply or Vercel deploy yet (M-01); `QueueBanner` is
  still a plan in `DESIGN_SYSTEM.md` §6 rather than an omission; **the art has still never been seen on a
  real phone over mobile data** — this audit was a desktop browser at a phone viewport, which is not the
  same test

---

## 2026-09-22 — Lane P's half of the walkable loop, on contracts that merged first

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

**Shipped**

- **The four Phase 0 Zod contracts (J-01…J-04), in one PR before any screen was written.** This is the
  first time the `WORKSTREAMS.md` §2 handshake was actually used, and it worked as advertised: four
  screens were then built upward from `z.infer` with no guessing about response shapes and nothing to
  renegotiate at the end. `GET /events/:id` and `GET /checkin/events` were **missing from
  `SYSTEM_DESIGN.md` §5** and are now in that table — an omission rather than a decision, found only
  because a register control needs a detail read
- **All four Lane P screens (P-01…P-04), each its own PR, each squash-merged on green CI.** Event
  detail with the register control; the officer gate; the learner XP screen; the leaderboard. Five PRs
  in total (#4–#8), 37 files, ~4,400 lines
- **The product's refusals are now product, not error handling.** A full event becomes a waitlist offer
  in place (US-2); `NOT_ELIGIBLE` names the one criterion that excluded the learner rather than failing
  generically; a duplicate scan reads as "already checked in" in a neutral tone with 0 XP; a learner
  hidden from a board still sees their own rank *and* is told why they are missing from the public one
  (FR-5.8)
- **The load-bearing claim is visible on the screen that makes it.** Every XP row names the check-in
  behind it, and a row that cannot be traced to one — a manual adjustment, feedback XP — does **not**
  get the "verified at the gate" mark rather than borrowing the authority of one. A reversal renders as
  a correction, because the ledger is append-only (R4)
- **The gate already has the Phase 3 shape where it matters.** Each scan carries a client-generated
  `jti`, and a send that fails **keeps** it, so the next tap replays that scan instead of creating a
  second one — the server's idempotency key is `(event_id, profile_id, jti)` and the UI now respects
  that rather than assuming it (R6). No `src/lib/qr`, no unsigned token path invented to fill the gap
- **67 new unit tests** (103 unit, 170 with integration). All of them on rules rather than layout: which
  refusal becomes an offer, where a cancellation lands, a learner at the top of the level ladder, a
  `levels` threshold that moved under a ledger already past it, a viewer who must not appear on a board
  twice
- **The fixture seam** (`src/lib/fixtures.ts`, `NEXT_PUBLIC_HIRAYA_FIXTURES=on`). Lane P's screens run
  against local fixtures while Lane D's endpoints do not exist, with `?preview=` choosing the state.
  Off by default, each fixture module behind a dynamic `import()` so an unset deployment never fetches
  the chunk, and **deleted with D-01…D-04** — recorded in the board, in `CONTRIBUTING.md` §2 and in
  every file's header

**Decisions**

- None new in the D-table. Three UI-level calls were taken as defaults and are recorded where they were
  made rather than as decisions: **no fill count** is published on an event (a "spots left" would have
  to outrank the registrations policy; `EVENT_FULL` carries the news instead); the leaderboard ships
  **three scopes, not four** (the org board needs an org id and a default-org rule nobody has written —
  it belongs on the org profile in Phase 1, P-12, and the contract still carries all four); and the
  scanner has **no queue indicator**, because Phase 0 is online only and "Queued: 0" would be a promise
  the code has not made

**Docs updated**

- `docs/WORKSTREAMS.md` → v1.1 — J-01…J-04 and P-01…P-04 struck with what closed them; D-01's row now
  names the three endpoints it owes; P-06 marked unblocked
- `docs/SYSTEM_DESIGN.md` §5 — `GET /events/:id` and `GET /checkin/events` added to the contract table
- `CONTRIBUTING.md` §2 — the fixtures flag and how to delete it; the test count, 72 → 170
- `.env.example` — `NEXT_PUBLIC_HIRAYA_FIXTURES`, with what it does when unset

**Risks**

- Materialized: **no MCP browser was reachable for the last part of the session** — Playwright and
  Chrome both failed to connect — so P-04 merged without the 360×800 a11y-tree walk that P-01, P-02 and
  P-03 each had before merge. Folded into P-06 and said so in the PR rather than quietly skipped
- Newly identified: **the test suite failed once in five consecutive local runs** and passed the other
  four. The failing file was not captured. The last session fixed a per-file isolation bug in this same
  harness, so the honest reading is that something in database setup still races. A future session
  should not treat a single green run as proof
- Retired: none

**Next**

- **P-06** — the one Lane P task left in Phase 0. Needs a working MCP browser: the WCAG AA sweep and the
  `browser_network_requests` check across all four screens, plus P-04's deferred walk
- **D-01**, which now owes three endpoints and is the head of the critical path. Every Lane D task in
  the Phase 0 table is unblocked
- The **fixture seam deletion** rides along with D-01…D-04 and should not be allowed to drift past them

**Flagged**

- **The 500 KB budget was measured from the build, not from the browser**, because the browser was not
  available: the whole client JS surface is **216 KB gzipped across 22 chunks**, fonts 58 KB, CSS 6 KB,
  and `public/` art 6 KB fetched lazily — so no single route can approach 500 KB. The roadmap's
  criterion names `browser_network_requests` specifically, so **it stays unticked**: this is a strong
  indication, not the check the acceptance criterion asks for
- **No Phase 0 acceptance criterion was ticked this checkpoint.** The loop is not walkable yet — four
  screens exist and run on fixtures, and the endpoints behind them are D-01…D-04. Screens without a
  data layer are half a loop, and ticking the box early is exactly the failure D27 warns about
- `DESIGN_SYSTEM.md` §6 lists `QueueBanner` among the officer components; the gate screen deliberately
  omits it until Phase 3. The inventory is a plan rather than a record, so it was left alone — but a
  future session should not read its absence as an oversight
- Unchanged: the OG card's typeface; no Supabase apply or Vercel deploy yet (M-01); the art has still
  never been seen on a real phone over mobile data

---

## 2026-09-21 — Green, and the first two pull requests

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

**Shipped**

- **`main` is green.** First successful CI run in the project's history: lint, typecheck, migration
  check, migrate, `db:verify-rls`, 72 tests, build — all seven steps, on a runner, in 2m21s. The
  cross-tenant denial test has now actually executed somewhere other than a laptop
- **A second fix was needed** and is not named in the entry below, which was written before it: the
  suite assumed **a fresh database per test file**. True on the embedded path, which boots a cluster
  per call, and false the moment `TEST_DATABASE_URL` points at one long-lived server — as CI does. Each
  file's fixtures leaked into the next file's assertions. It surfaced as the demo seed refusing to run
  beside a school that is not `is_demo`, next to a cross-tenant test whose entire job is to seed exactly
  such a school. **Both tests were right; the isolation was missing.** The external path now creates a
  scratch database per call and drops it on stop
- **PR #1 and PR #2 — the repository's first two.** Both squash-merged after green CI, the CI fix
  first because the art PR was blocked behind it. Five stale branches cleaned up; `main` is the only
  branch left
- **`docs/PROGRESS.md` hit its first merge conflict**, exactly where `WORKSTREAMS.md` §3 predicted, and
  was resolved by that section's rule: keep both entries, newest first. The already-merged entry was
  restored byte-for-byte rather than re-flowed — worth doing deliberately the first time, since the
  append-only rule is only as good as the first conflict resolved under it

**Risks**

- Materialized: none new. The one from the entry below is answered — the fix did reveal a second
  failure, as predicted, and it was a real bug in the test harness rather than a CI quirk
- Newly identified: **the embedded and external test paths had drifted**, and only one of them was ever
  exercised. Worth remembering when the next piece of infrastructure grows a second mode
- Retired: **"CI pipeline green"**, a Phase 0 deliverable that was never true and now is

**Next**

- **J-01, the registration contract.** With P-05 closed, every remaining Lane P task in Phase 0 is
  downstream of a Lane D contract. Nothing else is a better use of the next hour
- P-06: the first real `hiraya-mobile-audit`, with `browser_network_requests` against the 500 KB budget

**Flagged**

- **Everything merged today merged without review**, because there is one person. That is the documented
  path for the maintainer (`CONTRIBUTING.md` §4) and it stops being the path the moment the second
  developer starts
- Unchanged: `main` cannot be protected server-side on this plan (D26 as amended), so green CI is
  advisory rather than blocking
- Unchanged: the OG card's typeface; no Supabase apply or Vercel deploy yet (M-01); the art has still
  never been seen on a real phone over mobile data

---

## 2026-09-21 — Tier 1 art exists, and main is guarded by a hook because it cannot be guarded properly

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

**Shipped**

- **Tier 1 assets, complete** (P-05, `ASSET_CHECKLIST.md` §1.1–§1.8). Logomark and wordmark; 6 category
  marks; 4 level badges with unlock frames, the XP mark and the podium; 14 avatars; 5 empty states; the
  hero; the demo school's crest. Reviewable together at `/design`, checked at 360×800
- **The logomark is drawn once.** `src/app/icon.svg` for the browser tab and a component for the UI;
  the PWA, Apple and OG rasters are generated at build from the same geometry by `ImageResponse`, so no
  binary enters the repository and a raster cannot drift from its vector. Three prerendered icon
  routes, an `apple-icon`, an `opengraph-image` and a `manifest.ts` — **no new dependency**
- **Level badges carry their tier as pips**, not only as colour. DESIGN_SYSTEM.md §9 asks the
  progression to survive greyscale and colour-blind viewers, and a cool-to-warm ramp alone does not: it
  makes Bayani read as *yellow* rather than as *fourth*. The Bayani star went deep brown for the same
  reason — white on amber is about 1.9:1
- **The offline empty state is deliberately calm.** No red, no warning triangle, no severed cable. It
  appears at the worst moment of the worst day and its job is "held safely, will send"
- **`assets/` is gone from the plan.** A hand-written SVG is already its own editable source, so a
  parallel source tree was two files to keep in step for nothing. Static art sits in `public/` and is
  fetched lazily, off the JS budget; art that must take a token colour or a caller's size lives in
  `src/design/art/`
- **`.githooks/pre-push`**, refusing a direct push to `main`, plus the setup line that installs it

**Decisions**

- **D26 amended.** Branch protection on `main` **cannot be enabled**: GitHub gates both classic
  protection and rulesets behind a paid plan for private repositories, and D17 keeps this one private
  until Gate B. Both API calls return 403 "Upgrade to GitHub Pro or make this repository public". So
  the rule is held by a committed pre-push hook, by CI on every push and PR, and by `CONTRIBUTING.md` —
  three weaker things stacked, and the documents now say so rather than implying a control that is not
  there. The ways out each cost something real: Pro against a near-zero budget, or publishing a repo
  full of a school's future data before Gate B. It resolves at the Gate B transfer anyway

**Docs updated**

- `docs/ASSET_CHECKLIST.md` → v1.1 — every Tier 1 item ticked with its path and date; the file-location
  and generated-raster policies; the OG typeface caveat recorded rather than hidden
- `docs/TECHNICAL_ARCHITECTURE.md` — D26 amended; a limitation row for the unprotectable `main`
- `CONTRIBUTING.md` §2 and §4 — the `core.hooksPath` step, and an honest account of what holds `main`
- `CLAUDE.md` §2 — `assets/` replaced by `public/`; `.githooks/`; `design/art/`
- `docs/WORKSTREAMS.md` §5 — P-05 struck; M-01's visibility check struck

**Risks**

- Materialized: **the guard on `main` is not a control.** Recorded in the D-table and in the known
  limitations rather than papered over. R18 and R19 both rested partly on branch protection existing;
  they now rest on CI and on two people reading a document
- Newly identified: none
- Retired: **repository visibility.** Confirmed private (`gh repo view`, 2026-09-21) after six
  checkpoints carrying it. D17's assumption holds

**Next**

- **J-01, the registration contract.** With P-05 closed, every remaining Lane P task in Phase 0 is
  downstream of a Lane D contract, so this is now the highest-value merge available
- P-06, the first real `hiraya-mobile-audit` with `browser_network_requests` against the 500 KB budget

**Flagged**

- **The OG card renders in Satori's default typeface**, not Plus Jakarta Sans: `next/font` hands us a
  hashed build artefact and Satori needs a real TTF. Fixing it means vendoring ~200 KB — worth deciding
  deliberately. Caught only because the card was looked at; the first version also rendered a white
  chevron on a white tile, which typechecked perfectly
- **The category marks and badges have not been through `hiraya-design-system` or an a11y pass** beyond
  a 360×800 look. P-06 is where that happens
- No Supabase apply and no Vercel deploy yet (M-01). The art has never been seen on a real phone over
  mobile data, which is the acceptance criterion that actually matters
- Carried: the level thresholds are still invented and `hiraya-gamification-balancer` has not seen them;
  `test:e2e`, `cap:sync`, `cap:android` declared but unwired; assumptions A1–A7 unverified; Apple
  Developer fee ownership undecided; R13 live

---

## 2026-09-21 — CI has never passed, and now it does

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

**Shipped**

- **One CI step: bootstrap the Supabase roles before `db:migrate`.** The workflow runs against a bare
  `postgres:17` service container, which has no `anon`, `authenticated` or `service_role`. Every file
  in `src/db/rls/` GRANTs and REVOKEs against those three, so the first policy file failed with
  `role "anon" does not exist`. `scripts/bootstrap-roles.sql` already existed and already solved this —
  but only `tests/integration/helpers/db.ts` ever applied it, and the tests run *after* `db:migrate`

**The correction that matters**

**CI has failed on every run since the workflow was written** — every commit, every branch, all the way
back. Two earlier entries in this log record it as working. The entry of Phase 0 week 1 says "CI:
lint → typecheck → migration check → migrate → `db:verify-rls` → tests → build, against a real
`postgres:17` service container" as a thing that shipped; what shipped was a workflow that reached step
four and stopped. Phase 0 lists "CI pipeline green" as a deliverable, and it has never been true.

Past entries stay as written — that is what append-only means, and a log that quietly corrects itself is
worth less than one that visibly does. But nothing downstream of those claims should be trusted: no
commit on `main` has ever had its cross-tenant denial test run in CI. They have only ever been run
locally, by a person choosing to run them.

This is also the second thing in two days that was **documented as enforced and was not** — the first
being `rls_auto_enable()` existing only in the Supabase dashboard. Both share a shape worth naming: a
safety net whose absence is invisible until something else fails. The check that would have caught this
one is the cheapest possible check — *look at whether the badge is green* — and nobody had.

**Risks**

- Materialized: **every CI claim in this log was unverified.** The gap between "the workflow file says
  it runs" and "it ran" was never closed by anything
- Newly identified: **a workflow that has never succeeded looks identical to one that regressed.** Worth
  a required status check the moment the plan allows one (D26's amendment), because that is the thing
  that makes a red run *block* rather than merely exist
- Retired: none

**Next**

- Confirm this run goes green end to end — `db:verify-rls` and the full test suite have never executed
  on a runner, so this fix may only reveal the next failure
- Then J-01, the registration contract

**Flagged**

- **PR #1 (Tier 1 art) is blocked on this.** It cannot merge on green CI until this lands and it rebases
- `main` still cannot be protected server-side (D26 as amended), so even a green CI is advisory: nothing
  stops a red branch being pushed to `main` except the pre-push hook and two people paying attention

---

## 2026-09-21 — The roadmap stops being a schedule

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

**Shipped**

- **`main` is current again.** `feat/xp-balances` (the `xp_balances` `security_invoker` view and the
  events browse screen) and `docs/two-developer-onboarding` both merged. The flagged gap from the last
  entry — a contributor cloning `main` would have got neither — is closed. `typecheck` and `lint` clean
  on the merged tree
- **Week counts removed from Phases 0–6.** Phase headings, the flowchart labels, both gate headings and
  every "by week N" risk mitigation now name a position in the sequence or a condition instead of a
  date. The mitigations kept their teeth by becoming orderings: *start Phase 3 with the queue and the
  sync endpoint, not the scanner UI* says what *start it in week 11* was trying to say, and says it
  without needing a calendar to be true
- **A relative-weight table replaces the durations** (`MILESTONE_ROADMAP.md` §1). Not estimates —
  a way to know Phase 3 deserves room and Phase 5 will not take long however fast the work goes
- **What is still time-bound is now stated explicitly**, because removing the schedule makes it easy to
  forget that some clocks are not ours: the school calendar (Gate A needs a term in session, the pilot
  needs a whole semester ahead of it), Gate B's paperwork, app store review latency, and R13's idle
  Supabase project
- **The pilot keeps its weeks**, renumbered from the pilot's own first day rather than from project
  week 18. The week-3 weekly-active decay watch is a measurement window on real learners, not a
  developer deadline, and it survives unchanged

**Decisions**

- **D27** — the roadmap is a sequence, not a schedule. Binding: phase order, each phase's exit
  criteria, and the two gates. There is no external deadline — no defense, no client contract — so the
  week counts were estimates presented as commitments, and phases already carry acceptance criteria
  that say when they are done more precisely than a date could. **The cost is real and recorded:** we
  lose the ability to say "we are behind". Slippage now shows only as a phase that will not close, and
  nobody is counting

**Docs updated**

- `docs/MILESTONE_ROADMAP.md` → **v2.0** — header rewritten, flowchart relabelled, all nine phase and
  gate headings, four risk paragraphs, R15, and §11's pilot numbering
- `docs/TECHNICAL_ARCHITECTURE.md` → v1.2 — D27; two stale "inside 17 weeks" rationales corrected
- `CLAUDE.md` §10.1, `docs/PRD.md` §10, `README.md`, `docs/ASSET_CHECKLIST.md` §summary,
  `docs/WORKSTREAMS.md` §7, `.claude/skills/hiraya-feature-slice/SKILL.md` — every remaining
  "17-week plan" and "week N" reference outside the pilot

**Risks**

- Materialized: none
- Newly identified: **no schedule means no early warning.** The gates are the backstop — neither can be
  passed by asserting progress — and this log's own dates are the other. Worth watching whether a phase
  quietly stops appearing in new entries
- Retired: none. The week counts were never a risk mitigation, which is part of why they went

**Next**

- Unchanged: branch protection on `main`, then J-01 (the registration Zod contract) and P-05 (Tier 1
  assets, still unstarted, still dependency-free)

**Flagged**

- **Branch protection is still off**, and `main` was just pushed to directly — which is exactly what
  D26 says should stop being possible. Until it is on, D26's git half remains a convention
- Repository visibility **still unconfirmed as private**, now across six checkpoints
- `docs/ASSET_CHECKLIST.md` still has `assets/` and `public/` in its plan and neither directory exists.
  With no deadline, the risk shifts from *late* to *never* — Tier 1 assets are the one Phase 0
  deliverable with no dependency and no forcing function

---

## 2026-09-21 — Two developers, and a boundary drawn while it is still cheap

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

**Shipped** — documentation only; no application code changed.

- **`docs/WORKSTREAMS.md`.** Two lanes — **D** (schema, RLS, services, `/api/v1`, scripts, integration
  tests) for the incoming developer, **P** (screens, design system, i18n, assets, E2E) for the
  maintainer — with the Phase 0 and Phase 1 task boards, explicit `depends on` edges, a dependency
  graph, and the shared-file contention rules
- **The handshake is `features/<f>/schema.ts`.** The Zod contract merges in its own small PR *before*
  either lane starts; Lane D then builds downward from it and Lane P upward, against fixtures. This is
  what makes the lanes parallel rather than merely separate, and it costs nothing —
  `hiraya-feature-slice` already prescribed that order for one person
- **`CONTRIBUTING.md`.** First-hour reading order, a local setup that needs **no Supabase account**,
  branch and PR rules, and the eight prohibitions that cannot be inferred from reading the code
- **`.github/pull_request_template.md`.** The §5 test gates and the R1–R8 checks as a checklist,
  sectioned by what the PR touches so it is not ceremony on a docs change
- **One open migration repo-wide**, recorded in `src/db/README.md` and in the PR template. Two branches
  each holding a valid generated migration produce a combined apply order nobody tested, and
  drizzle-kit's numbering accepts both

**Decisions**

- **D26** — a second developer joins on the data-and-API lane **with no production access**. They run
  against a local Postgres and the synthetic tenant; the maintainer alone holds the service-role key,
  the LRN pepper, the QR private key, Supabase and Vercel, and applies migrations to Supabase. `main`
  becomes protected: PR with green CI, no direct pushes. The reason the boundary is drawn at access
  rather than at trust is D8 — **the processor agreement names one processor**, and a second person
  holding production credentials is a sub-processor the school would have to accept. Before Gate B
  there is no real data for the boundary to protect, which is precisely when it is cheap to establish
- **D3 amended** and **D16 superseded in part** by the above

**Docs updated**

- `docs/TECHNICAL_ARCHITECTURE.md` — D26; D3 and D16 amended; §1 constraint 3 rewritten; two new rows in
  the known-limitations table
- `docs/MILESTONE_ROADMAP.md` — two developers in the header, with an explicit note that the week counts
  were **not** re-cut; **R17 added to the register** (it was identified in the last checkpoint and never
  landed in the table); R18–R20 added for the coordination costs D26 introduces
- `CLAUDE.md` — §2 tree, §7 git policy (protected `main`, the two lanes, one open migration), §10.2 and
  §10.6, §11 preamble
- `README.md` — a contributor-first Development section and the two new documents in the table
- `docs/PRD.md` §10 — the constraints line
- `docs/PROGRESS.md` — this file's preamble now carries the author and merge convention
- `src/db/README.md`, `.env.example`, `SKILLS.md`, `.claude/skills/hiraya-checkpoint/SKILL.md`

**Risks**

- Materialized: none
- Newly identified: **R18** a second developer violates a rule nobody wrote down — mitigated by keeping
  the rules in the database, lint and CI rather than in review; **R19** parallel work produces
  conflicting migrations or a table without its policy or fixture; **R20** the migration round-trip
  through the maintainer becomes the bottleneck
- Registered late: **R17** (toolchain versus lint plugins), from the previous checkpoint

**Next**

- Turn on branch protection for `main` in GitHub settings — **nothing in this repository can enforce
  it**, and D26 assumes it
- J-01, the registration Zod contract, is the first task and blocks both lanes
- P-05, the Tier 1 assets, has no dependency and can start immediately

**Flagged**

- **Branch protection is not yet on.** Until it is, D26's git half is a convention, not a control
- **`feat/xp-balances` holds two unmerged commits** — the `xp_balances` `security_invoker` view and the
  events browse screen. They are on the branch, not on `main`, so a contributor cloning `main` today
  gets neither. They should land before the second developer clones
- Repository visibility **still unconfirmed as private** (carried from the last three checkpoints).
  D17 and now D26 both assume it, and a second collaborator makes it materially more urgent
- The second developer is not yet named in anything. If they ever need production access, D26 is
  reopened and the Gate B processor agreement has to name them — that is a decision, not a permission

---

## 2026-09-21 — A session exists, and it cannot reach a real school

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track

**Shipped**

- **The persona switcher (D23).** `/demo` lists the seeded tenant's 42 active personas, staff first;
  choosing one issues real `TenantClaims` through `withTenant`. It is a session, not a bypass: every
  screen behind it runs under the policies in `src/db/rls/` that the pilot will run under
- **The gate is in SQL, not in a service.** Two `SECURITY DEFINER` functions,
  `public.demo_personas()` and `public.demo_session_claims(uuid)`, filter on `s.is_demo` in their own
  WHERE clause. Neither takes a `school_id` from the caller — the tenant is read off the profile row —
  so a demo session for a real tenant is a row the function cannot reach rather than a rule somebody
  has to remember. Chosen over a fourth `AdminReason`, which would have put the gate in TypeScript
- **The cookie is a pointer, not a claim.** One profile id, httpOnly, 8 hours, `SameSite=Lax`. Claims
  are re-derived from the database every request, so there is nothing in it to forge — editing it can
  only name a different profile, which is exactly what the gate adjudicates
- **The DEMO DATA marker.** In the root layout, so no screen can forget it, plus its own copy on
  `/demo` — that page lists synthetic names *before* a session exists, so the layout's marker cannot
  cover it. Server-rendered, so it is in the first paint and cannot be photographed missing
- **`resolveSession` returns a session for the first time.** The demo source is wired as a *fallback*,
  so Phase 1's real source cannot be displaced by a cookie
- **`db:verify-rls` now checks functions** — no `SECURITY DEFINER` function may be callable by `anon`
  or leave its `search_path` unpinned. It found one on the first run (see Risks)
- **17 new tests, 72 in total** (9 unit, 8 integration). The gate is tested against a real school
  sitting in the same database as a synthetic one

**Decisions**

- **D25** — a demo tenant is two independent facts: `is_demo` **and** this deployment's
  `HIRAYA_DEMO_SCHOOLS` allowlist. Chosen by the maintainer after the privacy audit found one boolean
  column was the whole authorization boundary for an unauthenticated endpoint returning learners'
  names, grades and sections. Fails closed — unset serves nobody
- **D23 landed as specified**, with the switcher rather than a no-auth path, and with `/security-review`
  run before it shipped, as the decision asked

**Docs updated**

- `docs/TECHNICAL_ARCHITECTURE.md` §2 — D25
- `docs/SYSTEM_DESIGN.md` §5 — the three `/demo` endpoints, marked Phase 0 only and deleted rather than
  extended when real auth lands
- `docs/ASSET_CHECKLIST.md` §1.8 — the DEMO DATA marker landed, with its two limits
- `CLAUDE.md` §6 — a demo tenant is two facts, never one

**Risks**

- Materialized: **`rls_auto_enable()` existed only on the Supabase project, and `anon` held EXECUTE on
  it.** The D22 safety net that enables RLS on every new table was created by hand in the dashboard and
  was in no file, so a rebuilt database would silently not have had it — and the check it performs is
  invisible when missing, which is the worst property a safety net can have. Supabase's default
  privileges had also left it callable by `anon`. It is now `src/db/rls/03_ensure_rls.sql`, with the
  grant revoked, and the new function check in `db:verify-rls` is what found it
- Materialized, and answered: **the `is_demo` gate was a single point of failure** (privacy audit,
  HIGH). Answered by D25's second factor and by a trigger making the flag immutable after creation, so
  no existing school can ever be flipped into a demo tenant. A school still has to be *created*
  correctly — that is the residual, and it is why the allowlist exists
- Retired: none

**Next**

- The five loop screens, Tier 1 asset batches alongside — the switcher is the door, and there is
  nothing behind it yet
- `xp_balances`, which the XP and leaderboard screens need and which no migration creates

**Flagged**

- **CSRF on `POST /api/v1/demo/session`** — both reviews raised it, and both judged the impact nil
  today: every persona it can force is synthetic, and the catalogue is public anyway. It becomes real
  the moment `resolveSession` gains a Supabase Auth source, because a tokenless cookie-setting public
  endpoint must not sit beside a real login. **Phase 1 must not inherit this shape.**
- **The Capacitor shell has no server render**, so `DemoBar` — which resolves the marker server-side
  from the cookie — needs a client variant in Phase 5. Noted in the component and in
  `ASSET_CHECKLIST.md` §1.8
- **`/demo` first load is 206 KB** against the 500 KB budget, up from the 183 KB floor. Parsing the API
  response with the shared Zod schema had put all of Zod in the client bundle and cost 294 KB; the
  client now uses a shallow type guard and Zod stays server-side where R7 asks for it. Worth knowing
  before the next client component imports a schema module
- **A `server-only` stub now exists** at `tests/stubs/server-only.ts`, aliased in `vitest.config.ts`.
  Without it no service, query module, or session module can be unit-tested at all, because
  `server-only` throws on import outside a Server Component
- **`next dev` writes to `CLAUDE.md`.** Next 16 appends a `<!-- BEGIN:nextjs-agent-rules -->` block on
  every dev run. It is committed so the tree stays clean, but an instruction file that grows
  agent-directed content from a dependency is worth knowing about — both auditors flagged it
  independently as content not to trust by default
- **The level thresholds are still invented** (0 / 40 / 90 / 150) and `hiraya-gamification-balancer`
  has not seen them
- **`.claude/skills/hiraya-checkin-integrity` still calls `xp_balances` a materialized view**, which
  D19 reversed — carried, still not resolved
- Carried, unchanged: `TEST_DATABASE_URL` must stay unset on this machine; the QR Ed25519 keypair is
  deliberately empty; `test:e2e`, `cap:sync` and `cap:android` are declared but unwired; the Supabase
  MCP server is connected but `SUPABASE_ACCESS_TOKEN` is absent so every call returns `Unauthorized`;
  Next 16 refuses a second `next dev` in the same directory, which matters when testing two
  configurations; assumptions A1-A7 unverified; Apple Developer fee ownership undecided; R13 (Supabase
  pauses idle free projects after ~7 days) live; repository visibility **still unconfirmed as
  private**, now across five checkpoints, and D17 assumes it

---

## 2026-09-21 — The demo tenant exists, and re-running it is a no-op

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track

**Shipped**

- **A synthetic tenant with data in it.** `npm run db:seed:demo` writes 1 school, 44 profiles, 6
  organizations, 12 events, 138 registrations, 74 check-ins, 90 ledger rows and 4 announcements, from
  hand-authored JSON under `seed/` (`seed/README.md` explains how to edit it before a pitch). Applied
  to the Supabase project and to the test database
- **It writes through RLS, not around it.** Only the `schools` row is created as `service_role` — there
  is no tenant to be inside of yet, the same reason `AdminReason.TENANT_PROVISIONING` exists. Every
  other row inserts as `authenticated` carrying School Admin claims, so a policy that would refuse the
  real roster import refuses the seed too. The script does not import `src/lib/db/*`: both modules are
  `server-only`, which throws outside a Next runtime, so it mirrors `withTenant` over a raw connection
  the way `tests/integration/helpers/db.ts` already does
- **Re-running changes nothing.** `xp_ledger` holds no DELETE grant for any role and a trigger rejects
  the attempt even from the table owner (R4), so drop-and-reseed is not available and never will be.
  Every row therefore carries a UUIDv5 derived from a stable key (`profile:l07`, `checkin:e03:l12:2`),
  and a second run is a replay. Verified twice against Supabase and asserted in the suite: identical
  row counts, identical 1,370 total XP
- **Dates are relative to the run**, so a demo rehearsed in September still looks alive in December, and
  exactly one event is always an hour into its own window for the scanner to point at
- **The data carries the arguments the pitch makes.** One learner was scanned at two entrances on
  separate tokens, and the duplicate award is answered by a reversal row citing the original rather than
  by an edit. One event is rejected with a reason. Two learners have no consent record and stay at
  status `imported`, so the gate can be shown refusing rather than described
- **11 new integration tests, 46 in total**, including the replay assertion, "every attendance award
  cites a check-in that exists", "no LRN is stored for a synthetic learner", and the refusal to run
  beside a school not flagged `is_demo`

**Decisions**

- **D23** — the Phase 0 demo session is an `is_demo`-gated persona switcher issuing real claims through
  `withTenant`, not a bypass. Chosen by the maintainer over a no-auth demo path and over building Phase
  1 auth early. Lands next; wants `/security-review`
- **D24** — the Phase 0 scanner is a simulate-scan button, not a camera. `src/lib/qr` does not exist
  until Phase 3, and a demo-grade unsigned token path is the shape R5 forbids

**Docs updated**

- `docs/ASSET_CHECKLIST.md` §1.8 — what landed, the two deliberate omissions, and the two items still
  open (the school logo SVG and the DEMO DATA marker)
- `docs/SYSTEM_DESIGN.md` §4 — `xp_rules` holds no UPDATE grant for any role: changing a point value
  inserts a new effective-dated row
- `docs/TECHNICAL_ARCHITECTURE.md` §2 — D23 and D24; §3 testing row now names the default privileges
- `CLAUDE.md` §8 — `db:seed:demo` is wired, and what it refuses to do
- `seed/README.md` — new

**Risks**

- Materialized: **the local test database started stricter than production, so every `REVOKE` in
  `src/db/rls/` was untested.** Supabase grants `anon`, `authenticated` and `service_role` ALL on every
  new table in `public` by default privilege, and the policy files then revoke what each must not keep.
  `scripts/bootstrap-roles.sql` granted nothing, so a policy file that forgot its
  `REVOKE ALL ... FROM anon` would have passed locally and leaked on the project — and the
  `withServiceRole` path could not run under the harness at all. Found because the seed failed on
  embedded Postgres having succeeded on Supabase. The bootstrap now mirrors the default privileges;
  `db:verify-rls` is still clean under them, which is the first real evidence those revokes work
- Retired: none

**Next**

- The `is_demo`-gated persona switcher (D23), then the DEMO DATA marker, which needs a resolved tenant
  to ask `is_demo` about and a route that works in the Capacitor shell
- Then the five loop screens, Tier 1 asset batches alongside

**Flagged**

- **Nothing renders seeded learner data yet, so the DEMO DATA marker is not yet late — but it must
  exist before the first screen does.** A screenshot of an unmarked demo learner is the failure the
  marker exists to prevent, and the first screen is the moment that becomes possible
- **`xp_balances` does not exist.** It is documented in `SYSTEM_DESIGN.md` §4 and `DATA_FLOW.md` and
  settled as a `security_invoker` view by D19, but no migration creates it. The XP and leaderboard
  screens need it. `.claude/skills/hiraya-checkin-integrity` still calls it a materialized view, which
  D19 reversed — **not resolved here**: correcting a skill's text is cheap, but whoever does it should
  confirm the skill has no other pre-D19 assumptions
- **The four level thresholds are invented.** Nothing in `docs/` specifies them, and the seed had to
  pick: 0 / 40 / 90 / 150. They are set so one pilot quarter can span all four tiers rather than from
  any evidence, and `hiraya-gamification-balancer` has not seen them
- **`scripts/seed-demo.ts` is one 560-line function.** Linear and sectioned by table, which is the
  right shape for reading an insert order top to bottom, but it is the longest function in the
  repository and worth watching if the demo grows
- Carried, unchanged: `TEST_DATABASE_URL` must stay unset on this machine; the QR Ed25519 keypair is
  deliberately empty; `test:e2e`, `cap:sync` and `cap:android` are declared but unwired; the Supabase
  MCP server is connected but `SUPABASE_ACCESS_TOKEN` is absent from the process environment so every
  call returns `Unauthorized`; `npm start` fails silently when a previous server holds port 3000;
  `--ink-subtle` has no correct use at the current type scale; assumptions A1-A7 unverified; Apple
  Developer fee ownership undecided; R13 (Supabase pauses idle free projects after ~7 days) live —
  wake the project before a pitch; repository visibility **still unconfirmed as private**, carried now
  across four checkpoints, and D17 assumes it

---

## 2026-09-21 — Design system in code; the role list reconciled to ten

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track

**Shipped**

- **The token layer exists.** `src/design/tokens.css` is `DESIGN_SYSTEM.md` §2-§4 in code, declared
  inside Tailwind's `@theme` so every token also generates a utility. A component can reach a colour
  only by naming a token, which makes "no literal hex in a component" free to obey and visible in
  review when broken. The §3 type scale is one `@utility` per row of that table, carrying size, line
  height, weight and tracking together, so a heading cannot drift by being assembled from three
  half-remembered utilities
- **21 primitives** under `src/design/primitives/`, the full §6 inventory. Two are shared internals
  rather than new inventory: `Modal` is what `Dialog` and `Sheet` both are — a native `<dialog>`, which
  brings its own focus trap, Escape handling and inert background, none of which we now maintain — and
  `Field` is the label/hint/error wiring the three text controls share
- **The dual register is a CSS fact, not a convention.** `data-register="staff"` collapses
  `--duration-celebrate` to zero, so an adviser surface cannot celebrate by accident (D12). Verified in
  the browser: the gallery reports `0s`
- **Plus Jakarta Sans self-hosted** by `next/font` as one variable file covering 400-800, and
  `lucide-react` for icons. Both were already settled in `DESIGN_SYSTEM.md` §11 and the asset checklist
- **`/design` renders every primitive on one page** — the Phase 0 review point, the surface
  `hiraya-mobile-audit` runs against, and the answer to "does a primitive for this already exist?"
- **The role list now agrees.** `PRD.md` §3 lists ten roles; `SYSTEM_DESIGN.md` §2 gains an SSLG Adviser
  column and an "Open / close a season" row, and gives `guidance` and `school_head` their own capability
  table instead of a prose footnote. Every cell was read off `src/db/rls/*.sql` as applied, not intent

**Decisions**

- None new in the D-table. The role contradiction was resolved in favour of the code, which is what
  `CLAUDE.md` §10.4 asks for once the disagreement is surfaced rather than silently picked

**Docs updated**

- `docs/PRD.md` §3 — ten role rows; the enum named as the authority. FR-1.4 says ten
- `docs/SYSTEM_DESIGN.md` §2 — SSLG Adviser column, oversight-role table, two non-obvious rules the
  policies already enforce: the SSLG adviser may edit and approve any event but cannot draft one (no
  INSERT grant), and `sslg_adviser`/`school_head` see events at any status school-wide
- `docs/DESIGN_SYSTEM.md` §2, §6 — the status tint tokens Badge needed, the implementation note, what
  the mobile audit proved about `--ink-subtle`
- `docs/TECHNICAL_ARCHITECTURE.md` §3 — typeface and icon rows added to the stack table
- `docs/ASSET_CHECKLIST.md` §1.2, §1.3 — typography and Lucide ticked
- `.claude/skills/hiraya-checkpoint` — the consistency check names the enum as the authority instead of
  asserting seven roles
- `CLAUDE.md` §8 — `db:seed:demo` is declared but not yet wired

**Risks**

- Materialized: **the first mobile audit found six defects, all fixed before the commit.** The two worth
  remembering: `buttonClass` was exported from a `"use client"` module, so the landing page answered 500
  the moment a Server Component called it — a build and a typecheck both passed first; and both modals
  hardcoded `id="modal-title"`, so `aria-labelledby` resolved to whichever rendered first. The other
  four were a 28px switch target, `Tabs` reading "Upcoming3", an empty live region inside every loading
  button, and every `--ink-subtle` use in the codebase sitting on text below 16px
- Retired: none

**Next**

- Tier 1 SVG assets — wordmark, logomark, PWA icons, 4 level badges, 6 category icons, 12-16 avatars,
  5 empty states, hero. The tokens they recolour from now exist
- `scripts/seed-demo.ts` and the synthetic demo tenant with its DEMO DATA marker
- Then the walkable loop, the Vercel deploy, and the pitch kit

**Flagged**

- **`--ink-subtle` has no correct use at the current type scale.** It is 4.0:1 and permitted only at
  16px and up, and no style in `DESIGN_SYSTEM.md` §3 is both secondary and that large. All four uses in
  the first build were contrast failures. The token stays defined; `--ink-muted` is the answer until a
  large secondary style exists
- **The production build needs network access once.** `next/font` downloads Plus Jakarta Sans at build
  time and self-hosts it, so a fully offline build fails on a cold cache. The alternative — committing
  the woff2 — was not taken because it puts a binary in the repo for a cost we have not yet felt
- **First load is 192.6 KB on `/design`**, the page that imports every primitive, against the 500 KB
  budget: 151.6 KB JS, 26.6 KB font, 8.5 KB document, 5.9 KB CSS. The landing page is 185.9 KB. The
  design system cost roughly 10 KB over the previous near-empty baseline, so the headroom for features
  is real but the `next-intl` catalogue still serializes whole into every RSC payload, and the gallery
  added 64 keys to it
- **The Supabase MCP server is connected but unauthorized.** `.mcp.json` is correct — read-only, pinned
  to `zpdyybdqezkfiupobjaj` — but `SUPABASE_ACCESS_TOKEN` is absent from the process environment, so
  every call returns `Unauthorized`. It must be set in the user environment, not `.env.local`, and
  Claude Code restarted. Not blocking: `DATABASE_URL` reaches the project directly
- **`npm start` fails silently when a previous server still holds port 3000.** It exits non-zero into a
  log while the old build keeps answering, and an audit run against it measures the wrong code. This
  happened once during this session and produced a clean bill of health for a build that had none. Kill
  by PID from `netstat`, and check the served HTML for the change you just made
- Carried, unchanged: everything above ran against an empty database — no fixture, demo tenant or
  learner row exists, so the cross-tenant denial test still proves itself only on the embedded Postgres
  the suite boots; `TEST_DATABASE_URL` must stay unset on this machine; the QR Ed25519 keypair is still
  deliberately empty; `test:e2e`, `db:seed:demo`, `cap:sync` and `cap:android` are declared but unwired;
  assumptions A1-A7 unverified; Apple Developer fee ownership undecided; R13 (Supabase pauses idle free
  projects after ~7 days) live

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
