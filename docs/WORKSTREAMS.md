# Hiraya — Workstreams

**Status:** Active · **Version:** 2.0 · **Last updated:** 2026-09-26

The task board. `docs/MILESTONE_ROADMAP.md` says *what* and *in what order*;
`docs/BUILD_GUIDE.md` says *how*; this document says **who, what is next, and what blocks what.**

New here? Read [`CONTRIBUTING.md`](../CONTRIBUTING.md) first.

---

## 0. You are here

> **Updated by `/hiraya-checkpoint`. If this block and the tables below disagree, the tables win.**

**Phase 0 — Foundation, design system, demo tenant.** Every buildable task is built and on `main`, the
loop has been walked end to end against the real database, and **Hiraya is deployed and publicly
reachable**. Both defects that a visitor to that URL would have met are now closed. **What remains is
entirely the maintainer's:** the phone test, then the pitch kit.

| | |
|---|---|
| **Current phase** | 0 of 7 · Gate A not yet reached |
| **Last work to land** | **P-08** (`1c8fb07`, PR #27) — `avatar-15.svg` and `avatar-16.svg` authored, so the four seeded learners whose keys had no file no longer 404 on the roster, the board or the persona picker. Before it, **D-08** (`4a7bf73`, PR #26) — an SSLG officer can now work the gate, through a read-back of their own rows and a purpose-built lookup rather than a widened policy |
| **In flight** | Nothing. No open PRs |
| **Blocked on the maintainer** | **M-02**, the pitch kit. **M-03 is now run** — it did not pass, and what it found is a Lane D task, **M-04** |
| **Open tasks, whole project** | 3 in Phase 0 — **M-04 is code**, M-02 and the M-03 re-test are yours · 14 queued behind Gate A in Phase 1 |

**▶ Next, in order:**

| | Task | Who | Say |
|---|---|---|---|
| 1 | **M-04** — pin the Vercel function region to `sin1`, so queries stop crossing the Pacific | Lane D | `do M-04` |
| 2 | **M-03 re-test** — the phone test again, once M-04 is deployed | **you**, on a phone off wifi | `walk me through M-03` |
| 3 | **M-02** — pitch kit, then **Gate A** | **you**, with drafting help | `draft the pitch kit` |

**There is a Lane D task in Phase 0 again.** For a few hours on 2026-09-26 there was none, and then
M-03 was actually run and produced one. This is what the phone test is *for*: it is the only check
that touches PRD assumptions A1–A3, and the first time anyone ran it, it found that every API call in
the product crosses the Pacific twice. Phase 1 is still queued *behind Gate A* — starting it early is
the mistake `CLAUDE.md` §10.1 names — but **M-04** is Phase 0 work and it is open.

**Five of Phase 0's six acceptance criteria are ticked, and the sixth has now been measured and missed.** **WCAG AA closed on 2026-09-23** with
P-15, the Phase 0 bottom navigation — the last P-06 finding. The walkable loop and the 500 KB budget
closed on 2026-09-23; cross-tenant denial on 2026-09-21; no-real-learner-data on 2026-09-23. The
walkable-loop criterion's D-07 caveat — that the check-in half needed a same-day re-seed — **is now
gone**, and the criterion stands without it.

**One criterion remains open, and it is now open on evidence rather than on nobody having looked.**
*"Demo tenant loads on a real phone over mobile data in under 3 seconds"* was run on 2026-09-26 and
came back at **3–4 s, occasionally near 3 s** — over, consistently. The maintainer chose to record the
real number rather than tick the box, which is what `SETUP_GUIDE.md` §5a says the 3–6 s band means.

The cause is measured, not guessed. `/api/v1/demo/personas` takes a flat **1.28 s** to return 1,983
bytes, because the Vercel function runs in **iad1** (Washington DC) while Supabase is in
**ap-southeast-1** (Singapore) — so every query in the product crosses the Pacific twice. The repo has
no `vercel.json` or `vercel.ts`, so the deploy sits on Vercel's default region. `/demo` then pays that
cost *serially*: the persona list is a client fetch in `PersonaPicker.tsx` (a deliberate R3 choice) that
only begins after ~209 KB of JS has downloaded and hydrated on the phone.

**This is bigger than the demo screen.** Every `/api/v1` call from the Philippines is currently making
the same round trip, which bears directly on the **≥15 check-ins/minute** gate KPI that Phase 3 has to
meet. Booked as **M-04**; the M-03 re-test follows it. With native deferred (D35) the web PWA is the
only delivery path, so this is not a nice-to-have.

**The public URL is now clean of both defects it carried.** D-08 gave an SSLG officer — the role that
staffs a school-wide event, and the one P-15 ships a **Scan** tab to — a 500 at the gate; P-08 404ed
four of the cast's avatars on the roster, the board and the persona picker. Anyone given the URL today
meets neither. Both were verified against the deployed project, not only locally: the `checkins`
SELECT policy carries the `recorded_by` grant, `find_existing_checkin` exists as `SECURITY DEFINER`,
and all 16 avatars serve 200 from `hiraya-eosin.vercel.app`.

## 1. Lanes

A lane is **a kind of work, not a person.** Anyone can claim a task in any lane; the lane tells you
which files you are likely to touch and which rules bite hardest there.

| Lane | Scope | Paths it owns by default |
|---|---|---|
| **D — data and API** | Schema, policies, services, endpoints, migrations | `src/db/**`, `drizzle/**`, `src/features/*/queries.ts`, `src/features/*/service.ts`, `src/app/api/**`, `src/lib/db/**`, `src/lib/auth/**`, `scripts/**`, `tests/integration/**`, `seed/**` |
| **P — product surface** | Screens, components, design system, i18n, assets | `src/app/` route groups, `src/features/*/components/**`, `src/design/**`, `src/i18n/**`, `public/**`, `tests/e2e/**` |
| **Q — quality and docs** | Tests, documentation, accessibility sweeps, audits, tooling | `tests/unit/**`, `docs/**`, `.github/**`, `SKILLS.md`, agent and skill definitions |
| **Joint** | The handshake files — smallest PR first | `src/features/*/schema.ts`, `src/lib/errors.ts`, `src/lib/types/**` |
| **M — maintainer only** | Infrastructure, secrets, gates | Nothing in the repo. See [`SETUP_GUIDE.md`](SETUP_GUIDE.md) |

**The lane is a default, not a fence.** Anyone may edit another lane's files — say so in the PR
description, and do not do it in the same PR as your own lane's work. The point of the boundary is that
several people can work a whole day without touching the same file, not that files are locked.

### Claiming a task

1. Pick a task from a table below whose dependencies have all merged and whose **Owner** column is `—`.
2. Say which one you are taking, in the PR description or an issue. Put your handle in the Owner column
   in the same PR that starts the work.
3. Branch as `feat/<task-id>-<short-name>`, e.g. `feat/d-12-roster-import`.
4. When it merges, strike the row and name the commit that closed it.

**If you are new to the project, start in Lane Q.** A test, a doc fix, or an accessibility sweep gets
you through the whole loop — clone, branch, PR, CI, merge — without a mistake being able to reach the
database. Lane D is the opposite: it holds four of the eight architecture rules, and a mistake there is
a cross-tenant read rather than a visual bug.

### Before your first Lane D task

Read `CLAUDE.md` §3 and §6, `src/db/README.md` end to end, and `src/db/rls/profiles.sql` as a worked
example. Run the `hiraya-tenancy-auditor` agent on your own diff before opening the PR, not after review
asks for it. Lane D holds R1 (tenancy in RLS), R2 (service-role confinement), R4 (the append-only
ledger) and R7 (Zod at the boundary).

---

## 2. The handshake: `schema.ts` merges first

This is the mechanism that makes lanes genuinely parallel rather than merely separate. It works for two
contributors and it works for six.

```mermaid
flowchart LR
  J["Joint PR<br/>features/f/schema.ts<br/>Zod request + response"] --> D["Lane D<br/>RLS, queries, service,<br/>/api/v1 handler, tests"]
  J --> P["Lane P<br/>screens against the types,<br/>with fixture data"]
  J --> Q["Lane Q<br/>tests written against<br/>the contract"]
  D --> I["Integration<br/>real endpoint, real screen"]
  P --> I
  Q --> I
```

For every feature slice, the **Zod contract lands in its own small PR before any lane starts.** It is
the one file every lane reads and none owns alone. Once it is on `main`:

- **Lane D** builds downward — policy, queries, service, handler, tests. The response type is already
  fixed, so nothing is renegotiated at the end.
- **Lane P** builds upward — screens typed off `z.infer`, fed by a fixture until the endpoint exists.
- **Lane Q** can write the integration test from the contract alone, before either half exists.

**Changing a merged contract** is a joint PR that every affected lane approves, and it is the one change
that can invalidate work already in flight — so **widen rather than reshape** where you can. Adding an
optional field breaks nobody; renaming one breaks every open branch.

---

## 3. Shared files, and the rule for each

The files people collide on. Each protocol exists because the naive merge produces something that
typechecks and is wrong.

| File | Hazard | Rule |
|---|---|---|
| `src/db/schema.ts` + `drizzle/*.sql` | Two generated migrations with adjacent numbers, each valid alone, applying in an order nobody tested | **One open migration at a time, repo-wide.** Whoever holds it announces it, generates, merges, and keeps the branch short-lived. Nobody else runs `db:generate`. Need a column while one is open? Ask for it to go in that migration |
| `src/lib/errors.ts` | Two people add the same error code with different HTTP mappings | Append only, grouped as the taxonomy already is, one code per PR. Never renumber |
| `src/i18n/messages/en.json` · `fil.json` | JSON conflicts on nearly every PR; keys in `en` but not `fil` | Keys namespaced by feature (`events.register.full`). Add to **both** catalogues in the same commit. A conflict here is always "keep both" |
| `src/design/tokens.css` | A token renamed under a screen someone else is building | Lane P holds it. New tokens are additive; a rename is its own PR with the call-site sweep inside it |
| `docs/PROGRESS.md` | Append-only, newest first — everyone appends to the same line range | Everyone may append; **never edit a past entry**. On conflict, keep both, newest first. Each entry names its author |
| `docs/WORKSTREAMS.md` §0 | Several people updating "You are here" at once | Only `/hiraya-checkpoint` writes §0. On conflict, re-run it rather than merging by hand |
| `tests/integration/helpers/fixtures.ts` | The cross-tenant test enumerates tables from the live schema and fails on an unseeded one — so a new table breaks everyone's build | The migration PR that adds a table adds its fixture **in the same PR**. `npm test` on `main` is always green |
| `.env.example` | A new variable exists in one person's environment only | Any new variable lands in `.env.example` in the same PR, with a comment saying what breaks when it is unset |

---

## 4. What only the maintainer can do

Contributors work entirely against a **local Postgres with synthetic seed data** (`CONTRIBUTING.md` §2)
and are never given production keys. These tasks cannot be delegated, and nothing should be planned as
though they could. Full instructions: [`docs/SETUP_GUIDE.md`](SETUP_GUIDE.md).

- **Holding the real secrets** — `SUPABASE_SERVICE_ROLE_KEY`, `LRN_HMAC_PEPPER`, `QR_SIGNING_PRIVATE_KEY`
- **Vercel deploys** and the public demo URL
- **Repository settings** — collaborators, visibility, and the Gate B transfer to a school-owned org
- **Gate A** (the school conversations) and **Gate B** (DPO review, processor agreement, guardian
  consent, repository transfer)
- Store accounts at Phase 5

**Changed 2026-09-22 (D32):** applying migrations to Supabase is **no longer maintainer-only** — Claude
holds write access through the Supabase MCP server. The maintainer still owns the project and the keys.
This is the grant to revisit at Gate B, once real rosters exist.

---

## 5. Phase 0 — remaining work

Open acceptance criteria: **the phone test (M-03), and nothing else** — but it is now open on a
measurement rather than on nobody having run it. It came back at **3–4 s** against a <3 s bar on
2026-09-26, and what it found (**M-04**: functions in `iad1`, database in `ap-southeast-1`) is open
Phase 0 code work. The walkable loop and the public URL both closed on 2026-09-23 — this line claimed
otherwise until 2026-09-26. Tier 1 assets closed with P-05; the 500 KB budget closed with P-06 at
200–209 KB per route across 14 routes, measured in the browser. Note that the budget criterion is
unaffected by M-04 and remains closed: 209 KB of JS/CSS plus 28 KB of HTML still transfers today.
M-04 is latency, not weight.

| # | Task | Lane | Owner | Depends on | Status |
|---|---|---|---|---|---|
| ~~J-01~~ | ~~`features/registration/schema.ts`~~ | Joint | jash-aeio | — | **Done 2026-09-22.** Also `eventDetailSchema` in `features/events/schema.ts` — a register control needs a detail read, and `SYSTEM_DESIGN.md` §5 listed only the collection |
| ~~D-01~~ | ~~Registration slice~~ | D | jash-aeio | J-01 | **Done 2026-09-22** (PR #11). Capacity settled in SQL: `register_for_event` counts and writes behind `SELECT … FOR UPDATE` on the event row; `cancel_event_registration` promotes the head of the waitlist and renumbers in the same transaction. Both SECURITY DEFINER, both taking tenant and profile from claims, never from an argument |
| ~~P-01~~ | ~~Event detail screen and register control~~ | P | jash-aeio | J-01 | **Done 2026-09-22.** Runs on fixtures until P-07 deletes them |
| ~~J-02~~ | ~~`features/checkin/schema.ts`~~ — Phase 0 subset only (D24) | Joint | jash-aeio | — | **Done 2026-09-22.** `jti` is the idempotency key; `checkinResultSchema` is per-item so Phase 3's `/checkins/sync` is an array of it |
| ~~D-02~~ | ~~Check-in write path + the D18 XP function~~ | D | jash-aeio | J-02, D-01 | **Done 2026-09-22** (PR #11). `award_checkin_xp` is the single bridge from a scan to a point; awards at most once per learner per event under the event lock. **Non-negotiable test 2 passes** |
| ~~P-02~~ | ~~Officer check-in screen~~ | P | jash-aeio | J-02 | **Done 2026-09-22.** Simulate-scan, narrated as the camera (D24). No `src/lib/qr`, no invented token path |
| ~~J-03~~ | ~~`features/xp/schema.ts`~~ | Joint | jash-aeio | — | **Done 2026-09-22.** `delta` is signed, so a reversal renders as a reversal |
| ~~D-03~~ | ~~`GET /me/xp`~~ | D | jash-aeio | J-03, D-02 | **Done 2026-09-22** (PR #11). Exercised as a learner, not as the owner |
| ~~P-03~~ | ~~Learner XP screen~~ | P | jash-aeio | J-03 | **Done 2026-09-22.** Every row names its source; a row with no check-in behind it says so |
| ~~J-04~~ | ~~`features/leaderboard/schema.ts`~~ | Joint | jash-aeio | — | **Done 2026-09-22.** `viewer` separate from `rows`, always returned |
| ~~D-04~~ | ~~`GET /leaderboard`~~ | D | jash-aeio | J-04, D-03 | **Done 2026-09-22** (PR #11). Computed on read; Phase 4 swaps in snapshots without a contract change |
| ~~P-04~~ | ~~Leaderboard screen~~ | P | jash-aeio | J-04 | **Done 2026-09-22.** Three scopes; the org board waits for P-12 |
| ~~D-05~~ | ~~Extend `db:seed:demo`~~ | D | jash-aeio | D-01…D-04 | **Done 2026-09-22** (PR #11). Also fixed a real defect: `eligibility_json` was double-encoded, so the Senior-High-only event silently admitted the whole school |
| ~~P-05~~ | ~~Tier 1 assets~~ | P | jash-aeio | — | **Done 2026-09-21.** Reviewable at `/design`. One caveat open: the OG card's typeface |
| ~~P-06~~ | ~~`hiraya-mobile-audit` on every demo screen~~ | P | jash-aeio | P-01…P-05 | **Done 2026-09-22** (`904f6d0`). 14 routes walked at 360×800 on a production build, P-04's deferred walk included. **Budget passes**: 200–209 KB per route. **Two a11y failures found and fixed**: `text-primary` at 4.44:1 on the canvas, and no `h1` on `/checkin/[eventId]` — which also never named the event it was scanning. **One left open**: no `nav` landmark anywhere, booked as P-14 |
| ~~P-07~~ | ~~Delete the fixture seam~~ | P | jash-aeio | — | **Done 2026-09-23** (PR #14). Six files and the `NEXT_PUBLIC_HIRAYA_FIXTURES` flag gone, 677 lines deleted. Closed the P-06 finding it was expected to: `/events/<id>` ignored its own id because `fixtureEventDetail` ignored its argument. Walked at 360×800 against the seeded tenant — 208 KB, no fixture chunk |
| ~~P-08~~ | ~~Avatar keys outrun the assets~~ | P | jash-aeio | — | **Done 2026-09-26** (`1c8fb07`, PR #27). Closed by authoring `avatar-15.svg` and `avatar-16.svg` rather than taking the seed script to `% 14`. The two routes were not equivalent and the deployed data decided it: `profiles` already holds those four keys, so adding the files makes them resolve with no write to the database and no re-seed, where `% 14` would have needed one. Both follow the set's construction — 64×64, circle-clipped, one light geometric figure on a dark ground, non-figurative (§6); 285 and 433 bytes against a 2 KB ceiling. `ASSET_CHECKLIST.md` §1.5 asks for 12–16 and now records 16. The design gallery hardcoded 14 as well and now shows the whole set. Verified on the public URL: all 16 serve 200, `avatar-17` still 404s |
| ~~D-06~~ | ~~Registration answered VALIDATION_FAILED against every real database~~ | D | jash-aeio | — | **Done 2026-09-23** (PR #15). `tx.execute` returns postgres-js rows unparsed, so `r_registered_at` arrived as wire text where the row parser demanded a `Date`. The SQL was never wrong. Found by walking the loop, not by reading the diff, because `registration.test.ts` drove the SQL through raw postgres-js and the TypeScript wrapper had never run (D33). `asUserThroughDrizzle` is the seam that was missing |
| ~~D-07~~ | ~~The demo's live event goes stale hours after seeding~~ | D | jash-aeio | — | **Done 2026-09-25.** `happeningNow` is now a property of the event rather than of the moment it was seeded: the seed marks that one row `demo_rolls_live`, and `public.demo_roll_live_events` re-centres its window on now when a persona is picked, keeping the seeded five hours. The scan rule is untouched — `isWithinScanWindow` still decides every write against server time, so a scan can still fall outside the rolled window, which a never-ending event would have made impossible on the one event a teacher watches us scan into. Gated three ways: `s.is_demo`, the per-event flag, and a school id the caller has already cleared the D25 allowlist to learn. A partial unique index makes "one standing live event per school" a database fact rather than a check in the seed script — the tenancy audit's one finding |
| ~~D-08~~ | ~~An SSLG officer cannot check anyone in~~ | D | jash-aeio | — | **Done 2026-09-25** (`4a7bf73`, PR #26). Neither of the two fixes this row proposed was taken. Widening the SELECT policy to `sslg_officer` was written first and **blocked by `hiraya-privacy-auditor`**: with `profiles_select_tenant` already handing every learner the whole roster, school-wide attendance rows make roster-minus-attendees derivable — the non-participant list, which `SYSTEM_DESIGN.md` §2 denies to SSLG Officer and even to Guidance, and which `DATA_FLOW.md` T8 requires audited on every access. The role is held by learners. What shipped is narrower than either option: the SELECT policy grants `recorded_by = current_profile_id()`, so a session reads back only the rows it wrote — all `RETURNING id` needs — and the officer’s other question goes to `public.find_existing_checkin`, a SECURITY DEFINER bridge that re-states the INSERT policy and answers about one named learner with an id and no attendance detail. Same shape as `award_checkin_xp`, same reason. Ten integration tests, proven in both directions: four fail without the grant, two fail against the widened policy |
| ~~P-15~~ | ~~Phase 0 bottom navigation~~ | P | jash-aeio | — | **Done 2026-09-23.** Closes the last P-06 finding and with it Phase 0's **WCAG AA** criterion. A real `nav` landmark (`aria-label`, `aria-current="page"`) over the four screens that exist, plus **Scan** for the two officer roles. **Deliberately not P-14**: two of §7's five learner tabs (Orgs, Me) are Phase 1 screens, and a tab pointing at a 404 is worse than a tab that is not there yet — P-14 widens the item list and changes nothing else. Verified at 360×800: one landmark per screen, absent on `/demo` and `/design`, targets 83×54px, contrast 4.83:1 active and 6.0:1 inactive on `--surface`, focus ring on every tab, no horizontal scroll, 198 KB first load. 18 unit tests |
| ~~M-01~~ | ~~Apply the schema to Supabase; deploy to Vercel~~ | **M** | jash-aeio | D-05, P-06 | **Done 2026-09-23.** Live at `https://hiraya-eosin.vercel.app`; `/api/v1/health` answers `{"status":"ok","database":true}` and `/api/v1/demo/personas` offers 42. No commit — infrastructure, not code. **Two defects found and fixed in the deploying, both invisible locally**: the runtime had no `DATABASE_URL` (the variable existed but postdated the live build, and Vercel binds env at deploy time — the fix was a redeploy, not a new variable), and `HIRAYA_DEMO_SCHOOLS` did not match `halimbawa-demo`, so D25's allowlist discarded every persona and the public demo offered nobody. The second was hidden behind the first. R21 is answered: the SECURITY DEFINER functions read correctly where the caller is not a superuser |
| **M-03** | **The phone test** — load the demo on a real phone over mobile data, under 3 seconds | **M** | jash-aeio | M-01, **M-04** | **Run 2026-09-26 — did not pass. Still open, still blocking Phase 0.** Measured **3–4 s, occasionally near 3 s** on a real phone, mobile data, incognito, with Supabase pre-warmed. `SETUP_GUIDE.md` §5a puts 3–6 s in the *record the real number* band, and the maintainer chose that over ticking the box. The run was worth far more than the criterion: it is the only check that touches PRD assumptions A1–A3, and the first time anyone ran it, it surfaced **M-04**. Re-test once M-04 is deployed |
| **M-04** | **Pin the Vercel function region to `sin1`** — functions run in `iad1`, the database is in `ap-southeast-1` | **D** | claude | — | **Open, blocking M-03 and with it Phase 0.** Found by M-03 on 2026-09-26. `/api/v1/demo/personas` answers in a flat **1.28 s** for 1,983 bytes; `X-Vercel-Id: sin1::iad1` shows the request entering at the Singapore edge and the function executing in Washington DC, while `DATABASE_URL` points at `aws-0-ap-southeast-…pooler.supabase.com`. So every query in the product crosses the Pacific twice. The repo has no `vercel.json` or `vercel.ts`, so the deploy is on Vercel's default region — which means nobody chose this, it was inherited. **The blast radius is the whole API, not the demo screen:** the same round trip is in front of the **≥15 check-ins/minute** gate KPI that Phase 3 must hit. Fix is one config file pinning the function region to `sin1`; no schema change, no R3 tension. Re-measure `/api/v1/demo/personas` before and after, then hand M-03 back to the maintainer |
| **M-02** | Pitch kit — 1-page PDF, 5-slide deck, 3-minute phone script | **M** | jash-aeio | M-01 | **Open.** Gate A input. Claude can draft all three |

**Critical path:** ~~J-01 → D-01 → D-02 → D-03 → D-04 → D-05 → P-06 → P-07 → M-01~~ → **M-04 → M-03 re-test** → M-02 → **Gate A**. M-04 and M-03 entered the path on 2026-09-26, when the phone test was first actually run. ~~D-07~~ closed 2026-09-25; ~~D-08~~ and ~~P-08~~ closed 2026-09-25 and 2026-09-26. Both were off the path but visible on the public URL, and both are now gone from it.

---

## 6. Phase 1 — identity and organizations

Starts after Gate A. This is where the demo's session source is replaced by the real one, and it is the
phase with the most genuinely parallel work in the plan — good for onboarding contributors.

| # | Task | Lane | Owner | Depends on |
|---|---|---|---|---|
| **J-10** | `features/identity/schema.ts` — activate, login, `/me` | Joint | — | Gate A |
| **D-10** | Supabase Auth wiring; JWT claims stamped at login; `resolveSession` gets its **real** source | D | — | J-10 |
| **D-11** | **Delete the three `/demo` endpoints, the cookie path and the two SQL functions** | D | — | D-10 |
| **D-12** | CSV roster import — idempotent on `lrn_hmac`, per-row errors | D | — | D-10 |
| **D-13** | Activation codes in per-section batches; `CONSENT_REQUIRED` when `consent_records` is empty | D | — | D-12 |
| **D-14** | RBAC across every handler for the ten roles; admin-assisted password reset (D4) | D | — | D-10 |
| **J-11** | `features/orgs/schema.ts` — directory, profile, applications | Joint | — | — |
| **D-15** | Org profiles, officers, advisers and terms; membership applications with officer review | D | — | J-11, D-14 |
| **D-16** | `GET /admin/export` — complete CSV and JSON (NFR-12) | D | — | D-12 |
| **P-10** | Activation and login screens | P | — | J-10 |
| **P-11** | Discover Orgs with the six category filters, usable at 360×800 | P | — | J-11 |
| **P-12** | Org profile screen and the application flow; the org leaderboard scope | P | — | J-11 |
| **P-13** | School Admin console — import, codes, export | P | — | J-10, J-11 |
| **Q-10** | `hiraya-privacy-auditor` — LRN absent from every response below School Admin | Q | — | D-12, D-15 |
| **Q-11** | `hiraya-tenancy-auditor` and `/security-review` on the auth diff | Q | — | D-10, D-14 |
| **Q-12** | Integration tests for import idempotency — 1,000 rows twice is 1,000 profiles | Q | — | D-12 |
| **P-14** | **Bottom tab bar** (`DESIGN_SYSTEM.md` §7) — learner Home · Events · Orgs · Leaderboard · Me; officer adds the centre Scan; adviser Approvals · Events · Analytics · Me | P | — | P-11, P-12 |

**P-14 is now a widening, not a gap.** **P-15** (2026-09-23) shipped the Phase 0 bar and closed the WCAG criterion; P-14 adds the Orgs and Me tabs once those screens exist, and the adviser set. The component and its tests do not change — only the item list in `navView.ts` does.

**The original reasoning, kept because it is why P-15 is scoped the way it is.** The 2026-09-22 audit found **no `nav` landmark on
any screen and no navigation between screens at all** — a learner on `/xp` reaches `/events` only by
typing a URL. It is a real WCAG 2.1 AA gap against `DESIGN_SYSTEM.md` §8, and Phase 0 closes with it
open rather than with half a tab bar: two of the five learner tabs (Orgs, Me) are Phase 1 screens that
do not exist, and the Phase 0 demo is a scripted click-path that does not walk through a tab bar.
Building it to the spec's shape minus two items would be building it twice.

**D-11 is easy to postpone and is the highest-value deletion in the project so far.** Two session
sources is one more than this system can afford, and the second exists only because Phase 1 had not
happened yet.

**Good first tasks for a new contributor:** Q-12 (a clear, well-specified test), P-11 (a screen with no
security surface), or Q-10 (running an agent and writing up what it found).

---

## 7. Phases 2–6 — lane allocation

A task-level breakdown is written at the start of each phase, not now; written now it would be fiction.
What is settled is which lane leads and what blocks what.

| Phase | Lane D leads | Lane P leads | Lane Q leads | Hard dependency |
|---|---|---|---|---|
| **2 · Events** | proposal → approval state machine, SSLG dual approval, waitlist promotion, report generation, attendance CSV | officer proposal form, **adviser ≤3-tap approval**, calendar with conflict flags, post-event feedback | `hiraya-adviser-advocate` against the *design*, before the code | Phase 1. The advocate is a **blocking gate** |
| **3 · Check-in and XP** | `src/lib/qr` Ed25519, `/checkin/grant`, `/checkins/sync` idempotency, `xp_rules`, disputes, manual override | scanner UI, queue indicator, digital ID, dispute form | `hiraya-offline-scenario-tester` full matrix; both non-negotiable tests | Phase 2. **Open with the queue and sync endpoint, not the scanner UI** |
| **4 · Visibility** | snapshots, push delivery, analytics endpoints including the audited non-participant list | boards, merged announcement feed, notification preferences, charts (load `dataviz` first) | `hiraya-gamification-balancer` on the XP rules before launch | Phase 3 — boards need a populated ledger |
| ~~**5 · Native**~~ **DEFERRED (D35)** | — | — | — | Out of MVP scope from 2026-09-23. `MILESTONE_ROADMAP.md` §8 holds what it would take to resume |
| **6 · Hardening** | all five agents clean; backup restore **actually performed** | WCAG AA sweep, 500 KB budget | the manuals; `/security-review` across the codebase | Everything |

**Phase 3 is the one phase where the lanes cannot be fully parallel.** The scanner's local queue and the
sync endpoint are a single correctness argument, and splitting that argument across two people is how
duplicate XP ships. Pair on `/checkins/sync` and the queue, or give one person both sides of that slice.

---

## 8. Dependency graph — Phases 0 and 1

```mermaid
flowchart TD
  P07["P-07 delete fixtures"] --> M01["M-01 Supabase + Vercel"]
  M01 --> M02["M-02 pitch kit"]
  M02 --> GA{"GATE A"}
  GA --> J10["J-10 identity contract"]
  J10 --> D10["D-10 real session"]
  D10 --> D11["D-11 delete /demo"]
  D10 --> D12["D-12 roster import"]
  D10 --> D14["D-14 RBAC"]
  D12 --> D13["D-13 activation + consent"]
  D12 --> D16["D-16 export"]
  D12 --> Q12["Q-12 import tests"]
  P11 --> P14["P-14 tab bar"]
  P12 --> P14
  J10 --> P10["P-10 activation screens"]
  J11["J-11 orgs contract"] --> D15["D-15 org profiles"]
  J11 --> P11["P-11 discover orgs"]
  J11 --> P12["P-12 org profile"]
  D14 --> D15
  D15 --> Q10["Q-10 privacy audit"]
  D14 --> Q11["Q-11 tenancy + security review"]
```

---

## 9. Keeping this document true

`/hiraya-checkpoint` reconciles this document along with everything else: §0 is rewritten, merged tasks
are struck and name the commit that closed them, and a phase's tasks are written at that phase's start.

**A workstream document describing last month's plan is worse than none at all**, because several people
read it and act in opposite directions. If you find it stale, that is a bug worth a PR of its own.
