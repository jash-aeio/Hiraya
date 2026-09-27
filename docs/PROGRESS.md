# Hiraya — Progress Log

Append-only. Newest entry first. **Never edit a past entry** — this log is append-only for the same
reason the XP ledger is: a record you can rewrite is a record nobody trusts.

Maintained by the `hiraya-checkpoint` skill. See `CLAUDE.md` §7 for the six triggers.

**With more than one contributor** (D26, D31): every entry names its author on the `Phase:` line, and anyone may append.
A merge conflict here is always resolved by **keeping both entries, newest first** — never by choosing
one. An entry that describes only one lane's work is fine and expected; an entry that quietly drops
another lane's is the failure this file exists to prevent.

---

## 2026-09-27 — both audiences got a dashboard, and the audit earned its keep

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track — no code task open in Phase 0 · **By:** claude

Four PRs in one afternoon, on a scope addition the maintainer approved this morning: a dashboard for
each audience, in both registers and at both breakpoints.

**Shipped**

- **J-12** (`a00eaee`, PR #34) — an optional `status` on the events list contract, typed from
  `eventStatus.enumValues`. It narrows within what the `events` SELECT policy already grants and is
  deliberately **not** validated against the caller's role: that rule lives in `src/db/rls/events.sql`,
  and a second copy in a Zod schema would be the copy nobody audits.
- **P-16** (`3be4d53`, PR #35) — the ≥1024px sidebar `DESIGN_SYSTEM.md` §7 has specified since
  2026-09-21. **One `<nav>`, two layouts**: a second element behind `hidden lg:flex` would offer a
  screen reader two navigations where the P-06 audit asserts exactly one. It stays last in the DOM and
  takes `order-first` at ≥1024px, so the sidebar sits left while tab order still reaches page content
  first — which is why it needs no skip link.
- **P-17** (`8948f21`, PR #37) — the learner Home dashboard. `/` is no longer a placeholder for a
  learner. Hero XP card, snap-scroll stat strip, leaderboard before anything secondary, category tiles.
  Composes three existing endpoints with `allSettled`, so one dead endpoint costs its own section
  rather than the screen.
- **P-18** (`4fc7126`, PR #38) — the adviser and School Admin dashboard. `/` redirects staff to
  `/approvals`; their tabs are Approvals · Events. Calm register **verified at runtime rather than
  asserted**: `data-register="staff"`, `--duration-celebrate` computing to `0s`, zero medals. The queue
  sorts missed events first, because a pending event past its date is not a late approval — nobody
  approved it, so it never published, so no learner could register and no XP could be awarded.

**Decisions**

- **The scope bound held, and that is worth recording.** Every screen reads endpoints that already
  existed; the only data change across four PRs was one optional query field. No new table, no new
  policy, and none of Phase 4's analytics. The rule booked this morning — *if a dashboard needs a new
  endpoint to look right, it has crossed into a later phase and stops* — survived contact with the work.
- **Staff tabs replace the learner set rather than extend it.** An adviser has no points and no rank, so
  Home, XP and Leaderboard would be tabs to screens about nobody. Someone who is *both* adviser and
  learner is treated as a learner; an officer is a learner who also works the gate.
- No D-table change. Nothing here altered an architecture decision.

**Docs updated**

- `WORKSTREAMS.md` — J-12, P-16, P-17, P-18 struck with their commits; §0 rewritten; critical path notes
  that the slice was Gate A input and never on the path
- `DESIGN_SYSTEM.md` — §6 records `StatStrip`/`StatTile` and `CategoryTile` and why they are shared
  rather than learner-only; §6 and §7 record the one-element-two-layouts sidebar
- `ASSET_CHECKLIST.md` — §1.3 now lists the six navigation marks, including the **approvals** mark
  authored for the staff tab
- `SYSTEM_DESIGN.md` — §5 records the `status` parameter and its narrowing semantics

**Risks**

- Retired: *a staff persona has no screen*, which was a live Gate A risk — the walkthrough is with a
  teacher, and the teacher's own view did not exist.
- Watch: **first load moved 208 KB → 221 KB** against the 500 KB budget. Comfortable, but the dashboards
  are the heaviest screens so far and Phase 1 adds more.

**Next**

- **M-03 re-test** on a real phone, off wifi. It is the only thing that can tick Phase 0's last
  criterion, and it now measures the dashboards rather than a placeholder.

**Flagged**

- **A Tailwind rename that fails silently.** `break-words` became `wrap-break-word` in Tailwind v4.1;
  this project is on **4.3**, where the old name **emits no CSS and raises no error**. It reads correctly
  in the markup and lint says nothing — the only way to catch it is to measure `overflow-wrap` in the
  browser, which is how it was caught here, twice. Assume any Tailwind utility remembered from v3 may be
  a no-op.
- **Two defects were visible only in Filipino or only at 360px**: a 15-character Filipino word
  overflowing its tile where the English fits, and a snap-scroll container eating the 16px side gutter.
  Both would have shipped from a desktop English review.
- **Deleting a base branch on merge auto-closes the PRs stacked on it**, and a closed PR cannot be
  retargeted — PR #36 was lost that way and reopened as #37. When merging a stack, merge the base
  *without* `--delete-branch`, retarget the child first, then clean up.
- **Two pre-existing accessibility findings were reported rather than fixed**, because both would have
  widened a feature PR: `Avatar` always renders its name in an `sr-only` span, so every leaderboard row
  announces the name twice (true on `/leaderboard` since P-04); and a long name truncates in the podium
  row at 360px when the "You" badge and XP are both present. Neither is booked yet.
- **PR #31 (M-02's pitch kit) is still open and deliberately unmerged.** CI is green. It is content
  presented to a school and wants the maintainer's read, not an automated squash-merge.

---

## 2026-09-27 — the Pacific round trip is gone, and Phase 0 grew a dashboard

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track — the last Phase 0 code task on the critical path is closed · **By:** claude

**M-04 landed and was measured.** The fix is one file and four lines; the finding it closes was worth the
phone test that produced it.

**Shipped**

- **`vercel.json` pins the function region to `sin1`** (`9a87663`, PR #32). Functions now execute beside
  the database in `ap-southeast-1` instead of in Washington DC. Verified on production:

  | | Before | After |
  |---|---|---|
  | `X-Vercel-Id` | `sin1::iad1` | `sin1::sin1` |
  | `/api/v1/demo/personas`, warm | 1.27 s, 1.31 s, 1.30 s | 0.44 s, 0.15 s, 0.42 s |
  | Status and bytes | 200, 7,280 | 200, 7,280 |

  That is **~0.87 s off every `/api/v1` call in the product**, which is why this was never a demo-screen
  bug: the same round trip sits in front of the **≥15 check-ins/minute** KPI Phase 3 has to meet.

**Decisions**

- **D36:** the region is pinned in `vercel.json`, in the repo, rather than in Vercel project settings —
  a region that exists only in a dashboard is invisible to review and cannot be diffed the next time a
  phone test disagrees. `vercel.json` rather than the now-recommended `vercel.ts` because one static key
  does not justify a build-time dependency (`CLAUDE.md` §10.6). Two consequences recorded with it:
  moving the Supabase project now means editing this file and nothing checks the pairing, and Hobby
  allows exactly one function region so there is no multi-region fallback.
- **Phase 0 scope grew, by maintainer decision, to include a dashboard for each audience.** Asked for
  four choices and given four answers: build the **calm demo shell** now rather than Phase 4's admin
  analytics; build against the **recorded `kuest.` reference** in `DESIGN_SYSTEM.md` §1 rather than
  re-supplying the image; land **M-04 before** any UI; and build **both the mobile and the ≥1024px
  layouts** §7 specifies. Booked as **J-12, P-16, P-17, P-18**.

**Docs updated**

- `TECHNICAL_ARCHITECTURE.md` — D36 added
- `WORKSTREAMS.md` — M-04 struck with its measurements; §0 rewritten; critical path advanced to
  `… → M-01 → M-04~~ → M-03 re-test → M-02 → Gate A`; J-12, P-16, P-17, P-18 booked in the Phase 0 table
- `MILESTONE_ROADMAP.md` — the phone-load criterion records the improvement and **stays unticked**; the
  dashboard slice added to Phase 0's deliverables; the "over-building the demo" risk given explicit bounds

**Risks**

- Retired: *every API call crosses the Pacific twice* — measured before and after, on production.
- Materialized, mildly: **Phase 0 is now carrying scope it did not have**, against its own stated risk of
  over-building the demo. Bounded three ways rather than trusted: the new screens read only endpoints
  that already exist, the 500 KB budget holds, and `hiraya-mobile-audit` gates each merge. If a dashboard
  needs a new endpoint to look right, it has crossed into Phase 1 or Phase 4 and stops.

**Next**

- **M-03 re-test** — the phone test, on a phone, off wifi. It is the only thing that can tick Phase 0's
  last criterion, and M-04 has now removed its largest measured cause.

**Flagged**

- **A near-miss in verification method, recorded because it would have been invisible.** M-04 was almost
  marked verified against the preview deployment, where `/api/v1/demo/personas` answered in 0.40 s with
  no `iad1` in `X-Vercel-Id` — which looks exactly like the fix working. It was an **HTTP 302**: previews
  sit behind Vercel deployment protection and redirect at the edge, so the run measured a redirect and
  never invoked a function. Time a production URL, or use the protection bypass — and **a timing number
  without an HTTP status and a byte count beside it is not evidence.**
- **PR #31 (M-02's pitch kit) is open and deliberately unmerged.** CI is green on it. It is content
  presented to a school and wants the maintainer's read, not an automated squash-merge.
- The ~209 KB of JS that must download and hydrate before `/demo` issues its client fetch is now the
  largest remaining contributor to the phone-load criterion. P-16 to P-18 add screens to exactly that
  budget; that tension is real and is why the mobile audit gates them.

---

## 2026-09-26 — the phone test was run, and it found that every query crosses the Pacific

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** at risk — a Phase 0 acceptance criterion was measured and missed · **By:** jash-aeio

**M-03 was finally run on a real phone.** It did not pass, and it was worth far more than the criterion
it failed.

**Shipped**

- **M-03 measured: 3–4 s time-to-usable, occasionally near 3 s**, against a *under 3 seconds* bar. Real
  phone, mobile data, wifi off, incognito, Supabase pre-warmed from this machine so the R13 wake-up was
  not in the number. `SETUP_GUIDE.md` §5a puts 3–6 s in the *record the real number rather than tick the
  box* band, and that is what the maintainer chose
- **The cause was measured, not guessed.** `/api/v1/demo/personas` answers in a flat **1.28 s** for
  1,983 bytes — three runs, warm, from a wired desktop, variance under 20 ms. 1.28 s to return 2 KB is
  not a slow network, it is a round trip
- **`X-Vercel-Id: sin1::iad1`** — the request enters at the Singapore edge and the function executes in
  **iad1, Washington DC**. `DATABASE_URL` points at `aws-0-ap-southeast-…pooler.supabase.com`, so
  Supabase is in **Singapore**. There is no `vercel.json` and no `vercel.ts` in the repo, so the deploy
  sits on Vercel's default function region. **Nobody chose this; it was inherited from the default**
- Booked as **M-04** (Lane D, one config file) with the M-03 re-test behind it

**No code changed this entry.** Documentation only — the fix is deliberately a separate slice.

**Why `/demo` pays the full cost serially.** The page itself is a Server Component and its HTML is fast
(~0.4–0.7 s warm). The persona list is a client fetch in `PersonaPicker.tsx`, which is a deliberate R3
choice and documented as one in that file — reading the service from the Server Component would be a
second authorization path. So the 1.28 s cannot begin until ~209 KB of JS has downloaded, parsed and
hydrated on a budget Android. HTML, then hydrate, then 1.28 s: that is the 3–4 s, and the mobile leg
moving around is the *"sometimes near 3"*.

**Decisions**

- None new yet. **M-04 will likely warrant a D-row** when it lands, because "which region the functions
  run in" is exactly the kind of inherited default that a future session would otherwise re-derive from
  scratch — the same shape as D34, where the pooler port was wrong for a year of nobody looking

**Docs updated**

- `docs/MILESTONE_ROADMAP.md` — the phone-test criterion now carries the measured number and the cause;
  still unticked, because it was not met
- `docs/WORKSTREAMS.md` — §0 rewritten (there is a Lane D task in Phase 0 again), M-03 row updated from
  *open* to *run and failed*, **M-04 added**, critical path now `M-04 → M-03 re-test → M-02 → Gate A`
- `docs/PROGRESS.md` — this entry

**Risks**

- Materialized: **R-new — the ≥15 check-ins/minute gate KPI now has a known latency tax in front of it.**
  This is the part that outgrows M-03. Every `/api/v1` call from the Philippines currently makes the
  same Pacific round trip, and Phase 3 has to sustain 15 scans a minute at a school gate on the school's
  own network. A per-scan cost measured in whole seconds is not something to discover in Phase 3 with a
  teacher watching. M-04 is Phase 0 work for a Phase 3 reason
- Materialized: **PRD assumptions A1–A3 were unverified for the entire project, and the first contact
  with them cost a criterion.** They have been flagged in this log since the first entry. The lesson is
  not that the assumptions were wrong — it is that *a two-minute maintainer task sat open long enough
  for six code slices to land on top of it*, and it turned out to be the one holding a whole-API finding
- Not a risk: **the 500 KB first-load budget is unaffected and stays closed.** 28 KB HTML + 209 KB of
  JS/CSS across 11 assets, re-measured today on the deployed build. M-04 is latency, not weight — do not
  let the two criteria get conflated in a later reading

**Next**

- **M-04** — pin the function region to `sin1`. Lane D, one config file, no schema change, no R3 tension
- **M-03 re-test** — the maintainer, on the same phone, after M-04 deploys. Same procedure, §5a
- Then **M-02**, then **Gate A**, unchanged

**Flagged**

- **Re-measure `/api/v1/demo/personas` before and after M-04**, and put both numbers in the M-04 entry.
  The prediction on record is that most of the 1.28 s is the region hop; if pinning `sin1` does not move
  it substantially, the cause is something else — a slow query, or per-invocation pooler connection
  setup — and the M-04 row's stated diagnosis was wrong and must be corrected rather than quietly
  widened. **Write down what would falsify it before running the fix**
- **Vercel Hobby allows one function region.** M-04 should confirm the plan's limit before assuming a
  multi-region answer is available; one region matching the database is the whole fix here anyway
- **Check whether `sin1` is the best match for the school's actual network**, not just for Supabase.
  Singapore is the closest Vercel region to the Philippines and co-locates with the database, so it is
  almost certainly right — but this is worth one minute of checking rather than an assumption, since it
  is the second inherited default in this finding
- **A throttled desktop browser would never have found this.** §5a says so about CPU and cell handover;
  it turns out to be true for a reason §5a does not mention. Keep the phone test as a real phone test

---

## 2026-09-26 — `main` was never actually protected; it is now

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

Found while checking why a `--squash --auto` merge landed instantly instead of waiting for CI.

**Shipped**

- **Branch protection on `main`, for the first time.** `gh api repos/.../branches/main/protection`
  answered `404 Branch not protected`, and `rulesets` was empty — **D26 had been describing a state
  that did not exist.** The only thing refusing a direct push was `.githooks/pre-push`, which is local,
  opt-in via `core.hooksPath`, and bypassable with `--no-verify`. Now enforced server-side: required
  check `typecheck · lint · test · tenancy`, `strict` (branch must be current), `enforce_admins`, no
  force-push, no deletion, linear history required, conversation resolution required. **No required
  reviews** — that is deliberate, since D32 grant 4 has Claude squash-merging its own PRs, and
  requiring a review would break it

**Decisions**

- none new. This makes **D26** true rather than changing it. The D26 row now records the date
  enforcement actually landed and what enforces it, so no future session has to rediscover the gap

**Docs updated**

- `docs/TECHNICAL_ARCHITECTURE.md` — D26 row annotated with the enforcement date and settings

**Risks**

- Materialized: **two PRs merged today past a pending CI check** — #27 (P-08) and #28 (the checkpoint).
  `gh pr merge --auto` waits for *required* checks, and with none configured it merged at once. Both
  were re-run on `main` afterwards and both are green, so nothing bad shipped; the process failed, not
  the code. This is the specific failure D32 grant 4 was written to prevent — *"CI is the only
  automated gate left"* was false, because there was no automated gate at all
- Retired: **`main` is unprotected while the docs claim otherwise.** A `--auto` merge now genuinely
  waits for green, and a direct push is refused by GitHub rather than only by a local hook

**Next**

- Unchanged by this entry: **M-03**, then **M-02**, then **Gate A**. Both maintainer-only

**Flagged**

- **The next PR is the one that proves this works.** Protection was verified by reading the settings
  back, not by watching a merge block on a red check — that evidence arrives the first time CI is slow
  or fails. If a merge ever lands instantly again, this is the thing to re-check
- **`enforce_admins` is on, which binds the maintainer too.** If CI ever breaks in a way that must be
  merged past, protection has to be disabled deliberately and re-enabled after — that friction is the
  point, but it is friction, and it is worth knowing before meeting it at a bad moment

---

## 2026-09-26 — Both public defects closed; no code task left in Phase 0

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

Covers **two** merged slices, not one. D-08 landed on 2026-09-25 as PR #26 and was never checkpointed —
`WORKSTREAMS.md` was two slices stale when this pass started, still listing both as the next things to
build. Verified against the deployed project rather than only locally, because both defects were
defects *of the public URL*.

**Shipped**

- **An SSLG officer can work the gate** (D-08, `4a7bf73`, PR #26). `checkins_insert_hosts` admitted
  `sslg_officer` and `checkins_select_self_or_hosts` did not, while `insertCheckin` carries
  `RETURNING id` — Postgres runs the returned row through the SELECT policy, so the write died as
  `new row violates row-level security policy` and reached the officer as a 500. **Neither fix the
  task row proposed was taken.** Widening the SELECT policy to the role was written first and
  **`hiraya-privacy-auditor` blocked it**: `profiles_select_tenant` already hands every learner the
  whole roster, so school-wide attendance rows make roster-minus-attendees derivable — the
  non-participant list, which `SYSTEM_DESIGN.md` §2 denies to SSLG Officer and even to Guidance, and
  which `DATA_FLOW.md` T8 requires audited on every access. A raw SELECT satisfied by RLS is audited
  nowhere, and the role is held by learners. What shipped is narrower than either option: the SELECT
  policy grants `recorded_by = current_profile_id()`, so a session reads back only the rows it wrote —
  exactly what `RETURNING id` needs — and the officer's other question, *has this learner already been
  scanned in?*, goes to `public.find_existing_checkin`, a `SECURITY DEFINER` bridge that re-states the
  INSERT policy and answers about one named learner with an id and no attendance detail. Same shape as
  `award_checkin_xp`, and for the same reason. Ten integration tests, proven in both directions: four
  fail without the grant, two fail against the widened policy
- **No seeded learner 404s on their avatar** (P-08, `1c8fb07`, PR #27). `scripts/seed-demo.ts` derives
  keys modulo 16 against 14 files, so four of the 44-person cast carried dead keys — `avatar-15` twice,
  `avatar-16` twice — on the gate roster, the leaderboard and the persona picker, public since M-01.
  Closed by **authoring the two missing assets** rather than taking the seed to `% 14`. The deployed
  data decided which: those keys are already written in `profiles`, so adding files makes them resolve
  with **no write to the database and no re-seed**, where `% 14` would have needed one. Both follow the
  set's construction — 64×64, circle-clipped, one light geometric figure on a dark ground,
  non-figurative (`CLAUDE.md` §6), literal hex because `public/` art is fetched off the JS budget.
  285 and 433 bytes against a 2 KB ceiling. Figure-against-ground contrast 2.56 and 5.09, inside the
  existing set's own 2.06–4.22 spread; they are decorative (`alt=""`), so no WCAG criterion binds them

**Decisions**

- none new. D-08 applied **D25**-adjacent reasoning and the R1/R2 posture already in the D-table; the
  P-08 fork was a maintainer choice between two conforming options, recorded in PR #27 rather than
  the D-table because nothing about it constrains future work

**Docs updated**

- `docs/ASSET_CHECKLIST.md` — §1.5 avatar count 14 → 16, with why and when (landed in PR #27)
- `docs/WORKSTREAMS.md` — D-08 and P-08 struck with their commits; §0 rewritten; the critical-path
  line updated; §5's header corrected (see Risks); the Phase 1 open-task count corrected 17 → 14

**Risks**

- Materialized: **a slice can merge without a checkpoint, and the board goes stale silently.** D-08
  merged on the 25th and `WORKSTREAMS.md` §0 still named it the next task to build on the 26th. The
  six triggers (`CLAUDE.md` §7) were not run on PR #26. Nothing broke, but §0 is the first thing a
  session reads, and a session that had trusted it would have rebuilt a fix that was already on `main`
- Retired: **the public URL shows a visitor two defects.** Both are gone from it, and both were
  confirmed on the deployed project, not inferred from a green CI: the `checkins` SELECT policy carries
  the `recorded_by` grant, `find_existing_checkin` exists as `SECURITY DEFINER`, and all 16 avatars
  serve 200 from `hiraya-eosin.vercel.app` while `avatar-17` still 404s

**Next**

- **M-03**, the phone test — the last Phase 0 acceptance criterion, maintainer-only, two minutes
- **M-02**, the pitch kit, then **Gate A**
- **There is no Lane D or Lane P task left in Phase 0.** Phase 1 is queued *behind Gate A*; starting it
  early is the mistake `CLAUDE.md` §10.1 names

**Flagged**

- **`WORKSTREAMS.md` §5's header claimed the wrong open criteria and was corrected this pass.** It read
  *"Open acceptance criteria: the walkable loop and a public URL"*; both closed on 2026-09-23. Three
  days stale, in the sentence that introduces the Phase 0 table
- **The Phase 1 open-task count in §0 was wrong and was corrected this pass.** §0 claimed 17 queued
  behind Gate A; §6 holds 14 rows. Corrected to 14 per §0's own rule that the tables win. Where the 17
  came from is not recoverable from the history and is not worth recovering — but it is the second
  count in this file to drift, after the criteria line above
- **The MVP definition of done is consistent but not byte-identical** between `PRD.md` §4 and
  `MILESTONE_ROADMAP.md` §14. Same seven criteria, same order, same meaning; the wording differs in
  emphasis and one cites `CLAUDE.md` §5 where the other says "in CI". Left alone deliberately —
  reporting it rather than silently converging two documents that do not actually disagree
- **The DATABASE_URL contradiction flagged on 2026-09-24 was not re-examined this pass** and stands as
  recorded in that entry
- Consistency pass otherwise clean: superseded title in exactly its four sanctioned places, ten roles
  identical across `src/db/enums.ts`, `PRD.md` §3 and `SYSTEM_DESIGN.md` §2, all 35 D-numbers cited
  anywhere exist in the D-table, every task id has a row, design tokens match `tokens.css` exactly in
  both directions, and every `npm run` in `CONTRIBUTING.md` §2 exists in `package.json`

---

## 2026-09-25 — A checkpoint with no code in it: the MVP could not be completed as written

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

No code landed since `checkpoint-d-07`; `HEAD` was the checkpoint commit itself and the tree was clean.
The consistency pass ran anyway, and that is the entire content of this entry — three of its checks
failed. Documentation drift does not need a commit to happen, which is the argument for running the
pass on a quiet checkpoint rather than skipping it.

**Shipped**

- **The MVP definition of done no longer requires an app store.** Criterion 7 of seven, in both
  `PRD.md` and `MILESTONE_ROADMAP.md`, still read *"Web PWA and Android/iOS builds ship from one
  codebase against one database"* — a criterion D35 made impossible to tick when it deferred native out
  of MVP scope on 2026-09-23. Both files already recorded D35 correctly elsewhere (roadmap §8, the PRD
  delimitations table, NFR-10), so each had been contradicting itself for two days. It now reads that
  the **web PWA installs to a phone's home screen**, pointing at §8 for the deferred phase. This was
  the D35 checkpoint's miss: it updated the prose about native and left the acceptance criteria alone
- **`DESIGN_SYSTEM.md` §2 now shows the tokens the code actually defines.** The document specified
  `:root { --primary: #0D7F7C; … }`; `src/design/tokens.css` ships `@theme { --color-primary: #0d7f7c; … }`.
  All 29 hex values matched exactly — only the names and the enclosing block did not, so anyone
  copying a token name out of the specification wrote one that resolves to nothing. §2 is now the
  `@theme` block verbatim, and the implementation note says why the prefix is load-bearing rather than
  cosmetic: `@theme` derives each utility by stripping it (`--color-surface` → `bg-surface`), so a
  token without the prefix generates no utility. Verified both directions — 29 names, 29 values, no drift
- **`--font-sans` is documented** in §3, where `ASSET_CHECKLIST.md` had been citing it while
  `DESIGN_SYSTEM.md` never defined it. It was real all along (`tokens.css:78`)
- **`WORKSTREAMS.md`** — D-07's row was missing its closing pipe, and the header still said
  *Last updated: 2026-09-22* while §0 described work through the 25th

**Decisions**

- none. D35 was already decided; this entry only finishes applying it

**Docs updated**

- `docs/PRD.md`, `docs/MILESTONE_ROADMAP.md` — MVP criterion 7 rewritten as web-PWA-only, citing D35
- `docs/DESIGN_SYSTEM.md` — §2 token block converted to `@theme` with `--color-` names; implementation
  note rewritten; `--font-sans` added to §3
- `docs/WORKSTREAMS.md` — malformed D-07 row repaired, header date corrected

**Risks**

- Retired: *the MVP has an untickable acceptance criterion.* It was only two days old and nobody had
  reached it yet, but it would have surfaced at the worst possible moment — the Gate A pitch, where
  "what does done mean" is a question a principal asks
- Materialized: **a checkpoint can apply a decision to a document's prose and miss its lists.** D35
  landed in four places and missed the two that define completion. Both misses were in numbered
  criteria, which read like settled furniture and get skimmed. The consistency pass caught it two days
  later only because it greps rather than reads

**Next**

- Unchanged by this entry: **D-08** (an SSLG officer gets a 500 at the gate), then **P-08** (avatar keys
  outrun the assets), both open and unblocked. **M-03**, the phone test, is still the one Phase 0
  acceptance criterion that cannot be closed from this machine

**Flagged**

- **Nothing unresolved.** The three findings above were reported before being fixed and each was
  confirmed by the maintainer. The DATABASE_URL contradiction flagged on 2026-09-24 was not re-examined
  this pass and stands as recorded in that entry
- **`src/design/tokens.css`'s header still reads "If the two disagree, the document is the specification
  and this file is the bug."** That governance is unchanged and was left alone deliberately — but note
  it was exactly backwards in this instance: the code was right and the document was stale. It holds for
  *values*, which is what it was written about; it did not hold for *names*

---

## 2026-09-25 — The demo stops being a same-day artefact, and a check-in defect surfaces

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

One slice merged. Phase 0 still has one unticked acceptance criterion, still M-03, and the walkable-loop
criterion lost the caveat it has carried since it was ticked.

**Shipped**

- **D-07 — the demo's live event keeps itself live** (`3bfd8a8`, PR #23). `db:seed:demo` wrote Club
  Fair's window from the clock at seed time, so a tenant seeded the day before had no event an officer
  could open a gate for and the check-in half of the demo could not be walked at all. Since M-01 that
  demo is a public URL, so the staleness was public. `happeningNow` is now a property of the event
  rather than of the moment it was seeded: the seed marks that one row `demo_rolls_live`, and
  `public.demo_roll_live_events` re-centres its window on now when a persona is picked, carrying the
  seeded duration rather than re-stating it
- **The scan rule was deliberately left alone.** `isWithinScanWindow` still decides every write against
  server time, so a scan can still fall outside the rolled window. The alternative on the table was an
  event that never ends — three lines in the seed, and it would have made the one event a teacher
  watches us scan into the one event whose window can refuse nothing
- **Two migrations.** `0001` adds `events.demo_rolls_live`; `0002` adds
  `events_one_rolling_live_per_school`, a partial unique index. The second closes the tenancy audit's
  only finding: "exactly one flagged event" was held by a `throw` in the seed script, which is
  application code remembering a rule. `0001` was already applied, so it could not be edited
- **Nine new integration tests**, 265 total. The `is_demo` case plants a **real** school with the flag
  set and asserts zero rows move, so the test fails if the gate is removed rather than passing vacuously
- **Verified against the deployed database**, not only the harness: window pushed 30 hours into the past
  (`live_events_now = 0`, the exact D-07 state), persona switch, gate list shows Club Fair
  `scannableNow`, scan accepted for 10 XP, replay answers `duplicate` with 0

**Decisions**

- **No new D-number.** The fork — roll the window versus ship an event that never ends — is recorded in
  the header of `src/db/rls/08_demo_rolling_event.sql` and in PR #23. It is a demo-fixture decision, not
  an architectural one, and the D-table is already carrying operational entries it arguably should not
  (see the 2026-09-23 note on the Vercel Secret-vs-Config rule). Flagged in case a future session
  disagrees
- **Called from `startSession`, not `resolveDemoSession`.** The latter runs on every guarded request and
  in two Server Components; this is a write, and a write on a per-request path runs thousands of times
  to do the work of one. It runs after the D25 allowlist has already refused anything it should not reach

**Docs updated**

- `docs/WORKSTREAMS.md` — §0 rewritten, D-07 struck, **D-08 booked**
- `docs/MILESTONE_ROADMAP.md` — the walkable-loop criterion's D-07 caveat removed; the criterion now
  stands without it
- `docs/SYSTEM_DESIGN.md` §4 — `demo_rolls_live` added to the `events` row
- `docs/DATA_FLOW.md` §7 — the rolling event and its three gates
- `docs/SETUP_GUIDE.md` §12 — the `DATABASE_URL` contradiction, recorded and **not** resolved
- `seed/README.md` — the rolling-event paragraph, next to the dates it corrects

**Risks**

- Materialized: **an SSLG officer cannot check anyone in.** `checkins_insert_hosts` admits
  `sslg_officer` (`src/db/rls/checkins.sql:43`); `checkins_select_self_or_hosts` does not (`:24`); the
  insert carries `.returning({ id })` (`src/features/checkin/queries.ts:146`), so Postgres applies the
  SELECT policy to the new row and the write dies as `new row violates row-level security policy`,
  surfacing at the gate as a 500. Measured on the deployed project: `org_officer` of the hosting org,
  `sslg_adviser` and `school_admin` all scan; `sslg_officer` does not. Pre-existing on `main` and not
  introduced by this slice. Booked as **D-08**, not folded into PR #23 — the narrow fix widens who may
  *read* attendance rows, which is a privacy decision rather than only a bug fix
- Materialized: **`npm run db:*` on the maintainer's machine writes to the deployed project.** See
  **Flagged**
- Retired: **the demo as a same-day artefact.** It was the reason the check-in half of the pitch could
  not be shown on a URL more than five hours old

**Next**

- **D-08** — the SSLG officer check-in failure. Settle the fork first: widen the SELECT policy, or drop
  `RETURNING` and read the id back separately
- **P-08** — avatar keys outrun the assets, 404ing publicly
- **M-03** — the phone test. Two minutes, maintainer-only, and the last Phase 0 criterion
- **M-02** — the pitch kit, then Gate A

**Flagged**

- **`DATABASE_URL` on the maintainer's machine is the deployed Supabase project, not a local Postgres.**
  `.env.local` points it at the session pooler deliberately — there is no local Postgres installed — so
  every `db:migrate`, `db:rls`, `db:verify-rls` and `db:seed:demo` run there writes to **production**.
  Two documents say otherwise and both are read immediately before somebody runs a destructive command:
  `SETUP_GUIDE.md` §12's table row (*local Postgres*) and **`CLAUDE.md` §11 standing grant 2**, which
  permits those commands "against the local Postgres". **Neither was changed** — which side is wrong is
  the maintainer's call. It costs nothing today, because the only database holds synthetic data; it
  changes character entirely at **Gate B**, which is already named as the moment to revisit grant 3.
  The integration suite is unaffected: `TEST_DATABASE_URL` is unset, so it boots its own embedded
  Postgres and `assertDisposableDatabase` never sees the two match
- **The D-07 verification left a row in the public demo.** Bagwis Karagatan scanning Liwayway Talahib
  into Club Fair, plus its 10 XP ledger row. Kept, by decision, on the same basis as the Agila Batisan
  row the 2026-09-22 walk left: the ledger is append-only, and Club Fair showing two attendees is
  cosmetic. Worth knowing before the pitch, because `seed/demo-events.json` says that event's attendance
  is *deliberately empty*
- **A demo session can still outlive its rolled window.** The cookie lasts eight hours, the window is
  five. Re-picking the persona is one tap and rolls it again; widening the window to cover the cookie
  would have bought that hour at the cost of an event whose length is no longer the seed's
- **Phase 0 still cannot be declared complete by Claude**, unchanged from 2026-09-23. No
  `phase-0-complete` tag exists, and none should until M-03 returns a number
- **`/events/[id]` still has no `h1` in its SSR payload**, unchanged from 2026-09-23
- **P-14's scope is still "widen the nav item list"**, unchanged from 2026-09-23

---

## 2026-09-23 — Native leaves the MVP, the nav landmark lands, Phase 0 reaches five of six

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

Two merges and a scope decision. Phase 0 now has **one** unticked acceptance criterion, and it is the
one nobody at a keyboard can close.

**Shipped**

- **D35 — native packaging is out of MVP scope** (`52b7bf3`, PR #20). Maintainer decision: focus the
  pilot on one delivery path and take native up as post-pilot expansion. It cost almost nothing because
  **nothing native was ever built** — no Capacitor dependency, no `android/`, no `ios/`, no
  `src/lib/native/`. The whole footprint was two npm scripts invoking a binary that was never installed
  and 11 code comments citing Capacitor as *rationale*. Phase 5 is marked deferred rather than deleted;
  so are `ASSET_CHECKLIST.md` Tier 3 and `SETUP_GUIDE.md` §10
- **P-15 — the Phase 0 bottom navigation** (`6c54c13`, PR #21), which **closes WCAG AA**. The P-06
  audit found no `nav` landmark anywhere and no way between screens without typing a URL. Four tabs
  plus Scan for the two officer roles, scoped to the screens that exist. Verified at 360×800 on the
  production build across all six demo routes: one labelled landmark each, absent on `/demo` and
  `/design`, `aria-current` on the active tab, 83×54px targets, 4.83:1 active and 6.0:1 inactive
  contrast on `--surface`, focus ring on every tab, no horizontal scroll, 198 KB first load
- **Four contradictions resolved**, all flagged by the previous checkpoint: the `hiraya-checkpoint`
  skill told future sessions to `git push origin main`, which `CLAUDE.md` §7 forbids and
  `.githooks/pre-push` refuses; `PRD.md` §3 cited the `user_role` enum in `schema.ts` rather than
  `enums.ts`; the `HIRAYA_DEMO_SCHOOLS` allowlist was cited as D23 in two files and D25 in two others;
  and the `vercel link` `.gitignore` trap is now documented where it happens
- **`tests/unit/i18n-parity.test.ts`** — new, and beyond what was asked. Nothing covered catalogue
  parity. The nav is the first component whose *accessible names* come entirely from the catalogue, so
  a key missing from `fil.json` renders the key path and a screen reader announces it
- **M-03 booked** — the phone test, with a procedure in `SETUP_GUIDE.md` §5a

**Decisions**

- **D35** — native packaging out of MVP; supersedes D11. Two consequences recorded rather than buried:
  the **≥15 check-ins/min KPI** loses the thing D11 said it depended on and now rests on the browser
  `getUserMedia` path, so Phase 3 must measure it and a miss reopens Phase 5 rather than lowering the
  number; and **iOS Web Push goes from mitigated to unmitigated**, because D11's iOS app *was* the
  mitigation and Safari delivers push only to an installed PWA
- **R3 kept, rationale rewritten.** It was justified by Capacitor. It now leads with *one authorization
  path instead of two*, which never depended on native, and notes that keeping the API boundary is what
  would let native resume without re-deriving every check. No code changed
- **No D-number for the Vercel Secret-vs-Config rule.** Operational rather than architectural, so it
  went in `SETUP_GUIDE.md` §5 beside the variables it governs. Flagged in case a future session
  disagrees — the same altitude argument could be made for D34, which did get a number
- **The D23/D25 drift resolved to D25.** D23 is the persona switcher; D25 is the two-facts rule; the
  allowlist is the second fact. The one genuine D23 reference — why a database fact, not an env var, is
  the *primary* gate — is correct and stays

**Docs updated**

- `CLAUDE.md` — §1 delivery target, R3's rationale, R5 generalized from "Capacitor bundle" to any
  device, the `lib/native` → `lib/device` line, the `cap:*` commands removed
- `docs/TECHNICAL_ARCHITECTURE.md` — D35 added after D34, D11 struck as superseded, D1a rewritten, the
  stack and notification rows, the client diagram (with the `classDef` it was missing), the offline
  queue now IndexedDB-only, the iOS Web Push risk escalated
- `docs/MILESTONE_ROADMAP.md` — **WCAG AA ticked**; Phase 5 banner; Phase 3's throughput criterion now
  carries D35's consequence
- `docs/WORKSTREAMS.md` — §0 rewritten, P-15 and M-03 booked, M-01 struck, lane-5 row deferred
- `docs/DESIGN_SYSTEM.md` — `NavBar` and `NavIcon` added to the inventory as Chrome
- `docs/PRD.md`, `docs/DATA_FLOW.md`, `docs/ASSET_CHECKLIST.md`, `docs/SETUP_GUIDE.md`,
  `CONTRIBUTING.md`, `SKILLS.md`, `README.md`, and three `.claude/` skill and agent files

**Risks**

- Materialized: **the ≥15 check-ins/min KPI is now the roadmap's most exposed criterion.** D11 said
  native camera was what it depended on, and native is deferred. Phase 3 measures it or the target is
  a guess
- Materialized: **iOS push has no path without a home-screen install.** Onboarding must walk an iOS
  learner through Share → Add to Home Screen before promising a notification, and the pitch should not
  claim push on iOS without it
- Retired: **the WCAG AA gap**, open since the P-06 audit
- Retired: **R21**, already answered by M-01 and recorded here for the register

**Next**

- **M-03** — the phone test. Two minutes, maintainer-only, and the last Phase 0 criterion
- **D-07** — the demo's live event goes stale hours after seeding
- **P-08** — avatar keys outrun the assets, 404ing publicly
- **M-02** — the pitch kit, then Gate A

**Flagged**

- **Phase 0 cannot be declared complete by Claude.** Five criteria are ticked and the sixth needs a
  phone. No `phase-0-complete` tag was created, and none should be until M-03 returns a number
- **`/events/[id]` has no `h1` in its SSR payload.** It appears after hydration, because the screen is
  a client component that fetches (R3). Different in kind from the permanent gap P-06 found on
  `/checkin/[eventId]`, so it was not treated as a WCAG failure — but if M-03 reports a slow first
  paint, this is a heading that is missing for exactly as long as that paint takes
- **The nav prefetches every tab on every page** — Next's `<Link>` default, measured at ~10 KB across
  11 requests per page load. Kept, because instant tab switching is worth 10 KB. Revisit if M-03 says
  the connection is latency-bound rather than bandwidth-bound
- **`vercel link` silently rewrites `.gitignore`**, appending `.env*` *after* the `!.env.example`
  negation, where a later pattern wins. Caught and reverted; documented in `SETUP_GUIDE.md` §5. Check
  `git diff .gitignore` after any future `vercel link`
- **P-14's scope changed without P-14 changing.** It is no longer "the missing nav" but "widen the item
  list to Orgs and Me, and add the adviser set". The component and its tests do not change
- **Still open: whether the Secret-vs-Config rule deserves a D-number**, and the `--type config`
  re-typing was done for only two variables. The rest remain write-only Secrets, correctly

---

## 2026-09-23 — Hiraya is deployed, and the deploy found two defects nothing local could

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

**M-01 is done.** Hiraya is publicly reachable at `https://hiraya-eosin.vercel.app`. This entry has
almost no diff behind it — one docs commit — because the work was infrastructure. It is recorded from
live endpoint responses, not from memory.

**Shipped**

- **The deploy is live and verified.** `/api/v1/health` answers `{"status":"ok","database":true}`;
  `/api/v1/demo/personas` answers with `halimbawa-demo` and 42 personas. Project `sibol-hiraya/hiraya`
  on the free `*.vercel.app` URL (D9). The Vercel CLI is now installed and the repo is linked
- **Two defects found and fixed in the deploying, neither reproducible locally.** They are the point of
  this entry:
  1. **The production runtime had no `DATABASE_URL`** — every request died at the database for ten
     hours. The variable *was* in project settings; it was added after the live build, and **Vercel
     binds environment variables at deploy time**, so the functions serving traffic had none. The fix
     was a redeploy, not a new variable
  2. **`HIRAYA_DEMO_SCHOOLS` did not match `halimbawa-demo`**, so D25's allowlist discarded every
     persona and the public demo offered nobody — `{"schools":[]}`. **This was invisible until the
     first defect was fixed**, because nothing reached the gate while everything died before it
- **Runtime config brought in line with D34**: `DATABASE_URL` moved to the pooler in transaction mode
  (6543) with `DATABASE_POOL_MAX=1`, on both Production and Preview. Both ports were probed from the
  maintainer's machine before the change, so the target value was known good rather than assumed
- **`TEST_DATABASE_URL` removed from Production and Preview.** The deployed runtime never reads it and
  the suite it belongs to disables RLS mid-test; an unused database credential on a public deployment
  is pure downside. Pre-Gate-B and synthetic today, but this is exactly the variable that must not be
  deployed once rosters are real
- **`HIRAYA_DEMO_SCHOOLS` and `DATABASE_POOL_MAX` re-typed `Config` rather than `Secret`.** Vercel
  stores every variable write-only by default. Neither of these is a secret, and a write-only `1`
  cannot be audited by anyone later — it can only be destroyed and re-added to find out what it was

**Decisions**

- No new D-number. The Secret-vs-Config rule is operational rather than architectural, so it went into
  `SETUP_GUIDE.md` §5 beside the variables it governs. Flagged below in case a future session judges
  otherwise — the same altitude argument could be made for D34, which did get a number

**Docs updated**

- `docs/TECHNICAL_ARCHITECTURE.md` — **D34's stated cause corrected.** It read "its environment carried
  no database URL at all". That described the log line, not the project: the variable existed and the
  deployment predated it. Left as a visible correction rather than a silent overwrite, because the
  original sentence would send a future session hunting a missing variable that was never missing
- `docs/SETUP_GUIDE.md` §5 — rewritten and marked done. Adds `DATABASE_POOL_MAX`, the 6543 requirement
  and the reason, a Type column, the Secret-vs-Config rule, the `TEST_DATABASE_URL` prohibition, two
  verification curls, and the two facts that cost this deploy a day: **changing a variable does not
  change a running deployment**, and **`/api/v1/health` reports the same `degraded` for every cause** —
  the reason is only in `vercel logs` as `api.unhandled`. Removed the claim that the build "imports
  modules that read them": nothing in `src/` reads `LRN_HMAC_PEPPER` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  yet, so a missing one fails a request later rather than the build now. §4's "this unblocks M-01"
  moved to past tense; the §5 marker went 🔴 → ⚪
- `docs/WORKSTREAMS.md` — §0 rewritten, M-01 struck with its findings, critical path closed through
  M-01, D-07 and P-08 re-described as public defects

**Risks**

- Materialized: **local green proves nothing about a deployed runtime.** This is D33's lesson at the
  next layer out — D33 was a tested path differing from the production path inside one process; this is
  a whole environment differing. The build passed locally and on Vercel while the running application
  could not reach its database. CI cannot catch this class: nothing in CI deploys
- Materialized: **a public URL changes the severity of two open tasks.** D-07 (stale demo event) and
  P-08 (avatar 404s) were booked as local blemishes. They are now the first two things a visitor sees
- Retired: **R21** — whether the SECURITY DEFINER functions read correctly where the caller is not a
  superuser. Answered yes, against Supabase, through a deployed runtime

**Next**

- **D-07** — the demo's live event goes stale hours after seeding. It gates the check-in half of the
  pitch, which is the half the product argument rests on
- **P-08** — avatar keys outrun the assets, now 404ing publicly
- **M-02** — the pitch kit, then Gate A

**Flagged**

- **`vercel link` silently edited `.gitignore`** and the edit was not harmless. It appended `.vercel`
  and `.env*` — both already present at lines 9–10 and 38 — but `.env*` landed *after* the
  `!.env.example` negation at line 11, and in gitignore a later pattern wins. `.env.example` survives
  only because it is already tracked; a contributor recreating it would find `git add` silently
  skipping the one file `CONTRIBUTING.md` §2 tells them to copy. Reverted. **Worth re-checking after
  any future `vercel link`**
- **The health endpoint's silence is a deliberate trade, and it cost a day.** The `catch` in
  `pingDatabase()` collapses unset-variable, wrong-port and sleeping-project into one `degraded`. That
  is correct for a public endpoint and should not change. But it means the first move on any deployment
  problem is `vercel logs <url>`, not the health endpoint — now written into `SETUP_GUIDE.md` §5
- **Claude cannot write to Vercel's secret store.** `vercel env add` and `vercel env rm` are blocked by
  the harness; the maintainer ran them with the `!` prefix and Claude verified each result. Not a
  limitation worth routing around — it kept a human on every credential write — but it shapes how §5
  must be followed
- **A citation drift, reported not fixed.** `docs/PRD.md` §3 says the `user_role` enum lives in
  `src/db/schema.ts`; it is defined in `src/db/enums.ts`, which `schema.ts` re-exports with a wildcard.
  The PRD is therefore reachable-but-indirect rather than wrong. The checkpoint skill's own checklist
  names `enums.ts` as the authority. Which to standardize on is the maintainer's call — the same shape
  as the D23/D25 drift below, which is still open
- **Still open from 2026-09-22:** `.env.example` and `src/lib/auth/demo-allowlist.ts` cite the
  `HIRAYA_DEMO_SCHOOLS` allowlist as "the second half of the **D23** gate"; `CLAUDE.md` §6 and
  `SETUP_GUIDE.md` call it **D25**. This checkpoint touched §5 and left the citation alone rather than
  guess. It is now slightly more pressing: D25's allowlist is the thing that silently emptied the
  public demo, so the rule a reader is sent to should be the right one
- **The phone-over-mobile-data criterion is unblocked but untested.** The URL exists. What remains is a
  real phone on real mobile data — a maintainer action, and the only Phase 0 criterion that cannot be
  closed from this machine

---

## 2026-09-23 — The loop walked, and the two things that only a walk finds

**Phase:** 0 — Foundation, design system, demo tenant · **Status:** on track · **By:** jash-aeio

Two slices merged, and between them the Phase 0 loop was walked end to end against the Supabase
project for the first time. It did not survive the walk intact, which is the point of walking it.

**Shipped**

- **P-07 — the fixture seam is gone** (`f588b91`, PR #14). `src/lib/fixtures.ts`, the four
  `components/fixtures.ts`, `registrationFixtures.ts`, the `fixturesEnabled` branch in five screens
  and the `NEXT_PUBLIC_HIRAYA_FIXTURES` flag: 677 lines deleted. It closed the P-06 finding it was
  expected to — `/events/<id>` rendered one hard-coded event whatever id it was given, because
  `fixtureEventDetail` ignored its own argument. `.env.example`, `CONTRIBUTING.md`, `BUILD_GUIDE.md`
  and `SETUP_GUIDE.md` lost the flag with it
- **D-06 — registration answered `VALIDATION_FAILED` against every real database** (`f07ead4`, PR #15).
  Drizzle's `tx.execute` returns postgres-js rows unparsed, so `r_registered_at` arrived as
  `2026-09-22 17:07:32.461931+00` where the row parser demanded a `Date`. Cancellation shared the row
  and failed with it. The SQL was never wrong
- **The Supabase project now holds the whole schema.** `db:rls` applied 30 policy files that were not
  there; `xp_balances` did not exist, which is why `/xp` had been returning 500. SECURITY DEFINER
  functions went 3 → 7 and `db:verify-rls` is clean. **R21 is answered**: the three functions read
  correctly where the caller is not a superuser
- **The loop, walked** (2026-09-23, against Supabase, at 360×800): browse → register → check in → XP →
  leaderboard. Registering and cancelling persist. A scan awards 10 XP once and answers "already
  checked in" the second time, with one ledger row — **non-negotiable test 2, confirmed in a browser
  and not only in the suite**. The learner's XP screen names the event the point came from. An event
  that has ended refuses registration with `NOT_ELIGIBLE / registration_closed`, which is right

**Decisions**

- **D33** — an integration test for a query wrapper goes through a Drizzle transaction, not raw
  postgres-js. `asUser` tests SQL; the new `asUserThroughDrizzle` tests the TypeScript that parses what
  the SQL returns. Registration reached `main` broken with seventeen green tests over it because all
  seventeen took the path production does not

**Docs updated**

- `docs/MILESTONE_ROADMAP.md` — three Phase 0 acceptance criteria ticked from evidence: the walkable
  loop, the 500 KB budget (208 KB re-measured after P-07), and no real learner data. WCAG AA stays
  open on P-14; the phone-over-mobile-data load stays open on M-01
- `docs/WORKSTREAMS.md` — §0 rewritten; P-07 and D-06 struck; **P-08** and **D-07** booked
- `docs/TECHNICAL_ARCHITECTURE.md` — D33 added

**Risks**

- Materialized: **a slice can be green in CI and broken in production**, and D-06 is the proof. The
  suite tested the SQL thoroughly and the wrapper around it not at all. D33 closes this shape of hole;
  it does not close the general one, which is that CI is the only automated gate left (D32)
- Retired: none

**Next**

- **D-07** — the demo's live event goes stale hours after seeding
- **M-01** — the Vercel deploy. The schema half is done; what is left is genuinely maintainer-only

**Flagged**

- **The demo is a same-day artefact.** `db:seed:demo` gives Club Fair a five-hour window from seed
  time. Hours later `live_events_now = 0`: no officer can open a gate, and the check-in half of the
  pitch — the half the whole product argument rests on — cannot be shown. Booked as D-07, and it
  should close before M-02, not after
- **`P-08`: avatar keys outrun the assets.** `scripts/seed-demo.ts` assigns `avatar-01`…`avatar-16`
  against 14 files, so every 15th and 16th learner 404s on the roster, the board and the persona
  picker. Two ways to close it and they are not equivalent — see the row
- **A citation drift worth one line, not a fix by guess.** `.env.example` and
  `src/lib/auth/demo-allowlist.ts` call the `HIRAYA_DEMO_SCHOOLS` allowlist "the second half of the
  **D23** gate"; `CLAUDE.md` §6 and `SETUP_GUIDE.md` call it **D25**. `SYSTEM_DESIGN.md` cites both.
  D23 is the persona switcher and D25 is the two-facts rule, so D25 is the better citation for the
  allowlist — but the two files are pre-D25 phrasing rather than a contradiction, and which one was
  meant is the maintainer's call
- **Method note, recorded because it cost most of a session.** Half the walk was spent chasing an
  apparent "writes do not persist" defect that did not exist: the browser's demo session was one
  persona while the row being checked belonged to another, and a long real-time gap mid-session made
  stale comparisons look like frozen ones. Verify *which profile the session holds* before comparing a
  row, and read `clock_timestamp()` alongside anything time-sensitive

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
