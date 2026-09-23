# Hiraya — Setup Guide

**Status:** Active · **Version:** 1.0 · **Last updated:** 2026-09-22

**Everything only the maintainer can do**, in the order you will need it. Accounts, secrets, deploys,
and the two gates — each with what it is for, exactly what to do, and what breaks if you skip it.

`docs/BUILD_GUIDE.md` covers the build loop, which is mostly automated. This document is the other
half: the things that need a human with a credit card, a browser login, or a conversation with a
teacher. **Nothing here can be delegated to Claude**, and nothing in the plan should ever be scheduled
as though it could.

---

## 1. How to use this

You do not do all of this now. Each section says when it is needed.

| Symbol | Meaning |
|---|---|
| 🔴 | **Blocking** — something is waiting on this right now |
| 🟡 | Needed at a specific phase; do it just before |
| ⚪ | One-time, already done — here for the record and for whoever inherits this |
| 🤝 | You do part, Claude does part — the split is stated in the section |

**Claude will tell you when one of these is blocking.** Run `/hiraya-next` at the start of a session and
anything from this document that stands between you and the next task appears under **BLOCKED ON YOU**,
with the section number to open.

**The rule behind the split.** Claude can reach your local machine, your repository, and (as of
2026-09-22) the Supabase project. It cannot create accounts, accept terms of service, enter payment
details, hold a legal agreement, or talk to a teacher. That is the whole boundary — everything in this
document sits on the far side of it.

---

## 2. ⚪ Your machine

Done already if the project runs. Here for a rebuild or a new laptop.

**Install:** Node ≥ 20.11 · Docker Desktop (or any local Postgres 17) · git · the GitHub CLI (`gh`) ·
Claude Code.

```bash
git clone https://github.com/jash-aeio/Hiraya.git
cd Hiraya
npm install
cp .env.example .env.local
git config core.hooksPath .githooks    # do not skip — see below
```

**That last line matters more than it looks.** It installs `.githooks/pre-push`, which refuses a direct
push to `main`. Git never installs a repository's hooks by itself, so it is opt-in by design, and it is
the one setup step nothing will remind you about. It matters here because server-side branch protection
is unavailable: GitHub gates both classic protection and rulesets behind a paid plan for *private*
repositories, and this one stays private until the Gate B transfer (D17, D26). **The hook is a
reminder; CI is the enforcement.**

Then a local Postgres with two databases — one to develop against, one for the integration suite, which
disables RLS mid-test and must never be pointed at anything real:

```bash
docker run -d --name hiraya-pg -p 54322:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hiraya postgres:17
docker exec hiraya-pg psql -U postgres -c "CREATE DATABASE hiraya_test"
```

Fill in `.env.local` per `CONTRIBUTING.md` §2, then:

```bash
npm run db:migrate && npm run db:verify-rls && npm run db:seed:demo && npm test && npm run dev
```

Five commands. If `npm test` is not green on a clean clone, that is a `main` problem — say so rather
than working around it.

---

## 3. ⚪🤝 The secrets

Four values that must never enter the repository. `.gitignore` already covers `.env*`, but the real
protection is that you never paste one into a file, an issue, a chat, or a screenshot.

| Secret | What it protects | Where it lives | If it leaks |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS entirely — reads every school's every row | Supabase dashboard; Vercel env; your `.env.local` | **Rotate immediately.** Full read of all data |
| `LRN_HMAC_PEPPER` | The pepper that makes a hashed LRN un-guessable | Vercel env; your `.env.local` | LRNs become brute-forceable from the hashes. Cannot be rotated without re-importing every roster |
| `QR_SIGNING_PRIVATE_KEY` | Signs learner ID tokens (Phase 3) | Vercel env only | Anyone can mint a valid learner ID. The product's core claim fails |
| `SUPABASE_ACCESS_TOKEN` | Lets the MCP server act on your Supabase account | Your shell environment | Rotate in Supabase account settings |

### Generating them

🤝 **Claude can run these for you** — they print to your terminal and write nothing to disk. You then
paste the values into Vercel and Supabase yourself. Ask: `generate a new LRN pepper` or
`generate the Ed25519 keypair for QR signing`.

```bash
# LRN_HMAC_PEPPER — 32 random bytes
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# QR_SIGNING_PRIVATE_KEY / QR_SIGNING_PUBLIC_KEY — Ed25519 (needed at Phase 3, not before)
node -e "const c=require('crypto');const{publicKey,privateKey}=c.generateKeyPairSync('ed25519');console.log('PRIVATE:\n'+privateKey.export({type:'pkcs8',format:'pem'}));console.log('PUBLIC:\n'+publicKey.export({type:'spki',format:'pem'}))"
```

**Why the QR scheme is asymmetric, in one line:** officer phones verify with the *public* key and never
hold a secret, which is what makes offline check-in possible at all. **Never ship the private half to a
device** — not in a client bundle, not in a service-worker cache: anything that reaches a device is
public (R5).

---

## 4. ⚪🤝 Supabase

The project already exists: `zpdyybdqezkfiupobjaj`. This section is what you did, plus the one setting
you must never undo.

### The setting that must stay off

**The Data API (PostgREST) is disabled** — decision D22. This is load-bearing. An exposed Data API is a
second data layer whose authorization rests entirely on no policy ever being missed, which contradicts
the single-authorization-path argument the whole architecture is built on. With it off, a forgotten
policy is a bug; with it on, a forgotten policy is a public leak.

In the dashboard: **Project Settings → API → Data API**, off. (Supabase moves its menu labels
periodically; the setting is the concept, not the click path.) If you ever see `.from()` working from a
browser console against this project, something has re-enabled it.

### Keys you need from the dashboard

**Project Settings → API**: the project URL, the `anon` key, and the `service_role` key. The first two
go in Vercel as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the third as
`SUPABASE_SERVICE_ROLE_KEY`. **Project Settings → Database** gives the connection string for
`DATABASE_URL`.

### 🔴 Letting Claude apply migrations (new, 2026-09-22)

You granted this. It needs two things you must do once:

1. **A personal access token.** Supabase dashboard → account settings → **Access Tokens** → generate
   one. Then set it in your shell so the MCP server can read it:

   ```powershell
   # PowerShell, persistent for your user
   [Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN','sbp_your_token_here','User')
   ```

2. **Restart Claude Code.** `.mcp.json` has been changed to drop `--read-only`; an MCP server's
   configuration is read at startup, so the running session still holds the old one.

After restarting, ask Claude to `check the Supabase project state` — if it can list tables, it is
connected. **This is what unblocked M-01** (applying the schema to Supabase); the schema landed on
2026-09-21 and the deploy followed on 2026-09-23.

> **Why this was read-only until now, and what changed.** Read-only meant every migration round-tripped
> through you hand-running SQL in the dashboard — the exact bottleneck R20 predicted. Write access
> removes it. What it costs is that a bad migration can now reach the project without a human between.
> That is tolerable *specifically because* there is no real learner data before Gate B (§9) and the
> demo tenant is synthetic. **Revisit this grant at Gate B** — once real rosters exist, the calculation
> is different and this is exactly the kind of standing permission worth withdrawing.

### 🟡 Routine: waking the project

**R13 — the free Supabase project pauses when idle.** Before any pitch, demo, or meeting: open the
dashboard, confirm the project is awake, and load the public URL yourself. The morning of, every time.
A paused database during a Gate A conversation is the most avoidable way to lose a school.

---

## 5. ⚪🤝 Vercel — the public demo

**Done 2026-09-23 (M-01).** Live at `https://hiraya-eosin.vercel.app`, project `sibol-hiraya/hiraya`.
This section is kept as the procedure for rebuilding the deployment, and because the school will repeat
it at Gate B.

1. Sign in to Vercel with GitHub and import `jash-aeio/Hiraya`.
2. Framework preset: Next.js. Nothing else needs changing.
3. **Environment variables** — add every one of these before the first deploy:

   | Variable | Value | Type |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from §4 | Secret |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from §4 | Secret |
   | `SUPABASE_SERVICE_ROLE_KEY` | from §4 | Secret |
   | `DATABASE_URL` | the pooler in **transaction mode, port 6543** — see below | Secret |
   | `DATABASE_POOL_MAX` | `1` | **Config** |
   | `LRN_HMAC_PEPPER` | from §3 | Secret |
   | `HIRAYA_DEMO_SCHOOLS` | `halimbawa-demo` | **Config** |

   Leave `QR_SIGNING_*` empty until Phase 3. Do **not** set `TEST_DATABASE_URL` — the deployed runtime
   never reads it, and the suite it belongs to disables RLS mid-test.

   Set them all, but know that they are not all load-bearing yet: as of Phase 0 nothing in `src/` reads
   `LRN_HMAC_PEPPER` (Phase 1, roster import) or `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase Auth is not
   wired). A missing one will not fail the build today — it will fail a request later, which is a
   harder thing to notice.

   **`DATABASE_URL` is not the one in your `.env.local`** (D34). A deployed runtime uses the pooler in
   transaction mode — port **6543**, with `DATABASE_POOL_MAX=1`, because every serverless instance opens
   its own pool. Migrations stay on session mode (5432). Same host, same user, same password; only the
   port differs:

   ```
   postgres://postgres.<ref>:<password>@<region>.pooler.supabase.com:6543/postgres
   ```

   **Secret vs Config.** Vercel stores a variable as *Secret* by default: unreadable afterwards, and
   `vercel env pull` will not return it. That is right for credentials and wrong for `DATABASE_POOL_MAX`
   and `HIRAYA_DEMO_SCHOOLS`, which are not secrets — store those with `--type config` so a later
   session can verify their values instead of destroying and re-adding them to find out. A write-only
   `1` cannot be audited.

   `HIRAYA_DEMO_SCHOOLS` fails closed: unset means no demo personas at all, which is the safe default.
   It is the second half of the D25 gate — a demo tenant is `schools.is_demo` **and** the slug being
   named here, so a database mistake and a configuration mistake have to happen together before an
   unauthenticated endpoint could list a real school's learners. **The failure is silent by design:**
   a mismatched slug returns `{"schools":[]}`, not an error. If the demo offers nobody, check this first.

4. Deploy. Keep the free `*.vercel.app` URL — D9: do not defend a domain name before there is a partner.

5. **Verify, because a green build proves nothing about the runtime:**

   ```bash
   curl https://<your-url>/api/v1/health         # expect {"status":"ok","database":true}
   curl https://<your-url>/api/v1/demo/personas  # expect a non-empty schools array
   ```

**Changing an environment variable does not change a running deployment.** Vercel binds variables at
deploy time, so a variable added after the last build is invisible to the functions serving traffic
until you redeploy (`vercel deploy --prod`). This cost the first deploy ten hours of looking like a
connection problem.

**`/api/v1/health` will not tell you why.** It reports `degraded` for every failure alike — an unset
variable, a wrong port, a sleeping project — because it is public and deliberately leaks nothing
(`pingDatabase().catch(() => false)`). The reason is in the function logs as `api.unhandled`:
`vercel logs <deployment-url>`.

**`vercel link` edits `.gitignore`, and the edit is not safe here.** It appends `.vercel` and `.env*`
to the end of the file. Both are already covered (lines 9–10 and 38), but `.env*` lands *after* the
`!.env.example` negation on line 11, and in gitignore the last matching pattern wins — so
`.env.example` becomes ignored. It survives only because it is already tracked; a contributor
recreating it would find `git add` silently skipping the one file `CONTRIBUTING.md` §2 tells them to
copy. **Check `git diff .gitignore` after any `vercel link` and revert it.**

🤝 Claude can read logs, list variables, and check the deployed build's bundle budget and accessibility
(`hiraya-mobile-audit`) once the URL exists. It **cannot write to the secret store** — `vercel env
add`/`rm` are blocked for it, so run those yourself with the `!` prefix and Claude will verify the
result.

---

## 5a. 🔴 The phone test — the last Phase 0 criterion (M-03)

**Two minutes, and only you can do it.** Phase 0's last unticked acceptance criterion is *"Demo tenant
loads on a real phone over mobile data in under 3 seconds."* Every other criterion is closed. A desktop
browser throttled to "Slow 3G" is not this test: it simulates bandwidth, not a budget Android's CPU, not
a real cell handover, and not the tower your school actually sits under. Assumptions **A1–A3** in
`docs/PRD.md` are about Ana's shared prepaid phone, and this is the only check that touches them.

Since D35 deferred native, **the web PWA is the only delivery path** — so this is not a nice-to-have.

**Do this:**

1. On your phone, **turn wifi off.** Mobile data only. Do not use a hotspot from a laptop.
2. Open a **private/incognito** tab — an empty cache is the first-visit case, which is the one that
   matters for a learner opening a link at homeroom.
3. Load **`https://hiraya-eosin.vercel.app/demo`** and start counting when you hit go.
4. Note **how many seconds until you can read the persona list** — not until the spinner appears, and
   not until the page finishes settling. Time-to-usable is the number.
5. Tap a **learner** persona, then walk: **Events → an event → Leaderboard → XP**, using the bottom
   tab bar (P-15). Note anything that feels slow, any tab that is hard to hit with a thumb, and any
   text you have to squint at.
6. Tell Claude the number and what you noticed, and it will record the result in
   `docs/MILESTONE_ROADMAP.md` and `docs/PROGRESS.md`.

**What the answer means:**

| Result | What it means |
|---|---|
| **Under 3 s** | Criterion closed. **Phase 0 is complete** and the next thing is Gate A |
| **3–6 s** | Record the real number rather than tick the box. Usually the free Supabase project waking (R13) — load it once before timing, then time a second cold load |
| **Over 6 s** | A finding, not a formality. Book it and fix it before the pitch: a demo that takes this long on the school's own network will be judged on that, not on the loop |

**Before a pitch, always:** load the URL once a few minutes ahead. The free Supabase project sleeps
(R13), and the first request after it sleeps pays the wake-up cost in front of your audience.

---

## 6. 🟡 Rotating a secret

When a key leaks, or at Gate B when the school takes ownership.

1. Generate the replacement (§3) or rotate it in the Supabase dashboard.
2. Update it in Vercel → redeploy.
3. Update your `.env.local`.
4. If it was `SUPABASE_SERVICE_ROLE_KEY`, assume the old one was used and check Supabase logs.
5. Note it in `docs/PROGRESS.md` — ask Claude to append the entry.

`LRN_HMAC_PEPPER` is the one that does not rotate cleanly: every stored `lrn_hmac` was computed with it,
so changing it means re-importing every roster. Treat it accordingly.

---

## 7. 🟡 Inviting other developers

The project is built to take contributors. Three lanes, claimable by anyone — see
`docs/WORKSTREAMS.md` §1.

**To invite someone:**

1. GitHub → repository **Settings → Collaborators → Add people**. Give **Write**. Never Admin: admin can
   change repository settings and delete the repository, and nothing a contributor does requires it.
2. Send them exactly this:

   > Read `CONTRIBUTING.md` first — it has the full local setup, and you do not need any of my keys or a
   > Supabase account. Everything runs against a local Postgres with synthetic data. Pick an unclaimed
   > task from `docs/WORKSTREAMS.md` and say which one you are taking before you start.

3. That is all. **Do not send them a `.env.local`, a service-role key, or a database URL.** The project
   runs locally without any of it, by design.

**Why the access boundary is this strict.** D8 names *one* processor in the school's data processing
agreement. A second person holding production credentials becomes a sub-processor that the agreement
has to name and the school has to accept. Local-only means there is nothing to name — and before Gate B
there is no real data for the boundary to protect, which is exactly when a boundary is cheap to
establish and expensive to add later.

**What to do when they open their first PR:** the same six checks as your own (`BUILD_GUIDE.md` §6),
plus one — does their PR stay inside one lane and one feature? A PR spanning two lanes is hard to review
and harder to revert. Ask them to split it; it is not a criticism, it is the house style.

---

## 8. 🟡 Gate A — school buy-in

**After Phase 0. This is a conversation, not a checklist, and it is the single highest-leverage hour in
the whole project.**

**Bring:** a phone with the demo loaded (wake Supabase that morning — §4), the one-page PDF, and the
5-slide deck. Nothing else. Do not bring a laptop; the point is that they hold it.

**Do, in order:**

1. Walk the demo with the **ICT coordinator** and the **SSLG adviser**, on a phone, in person. Let them
   tap. Hand the phone over within the first minute — a demo you are driving is a presentation, and
   teachers approve what they can touch.
2. Show the adviser approval flow specifically. Their adoption decision is made there and nowhere else.
3. Get **verbal support from the school head.**
4. Get an ICT coordinator or teacher **named as prospective custodian** — a name, not a role.
5. Schedule or complete the **device and connectivity survey** (it validates assumptions A1–A3 in
   `docs/PRD.md`, which the offline design depends on).
6. Identify the school's **DPO or data-protection focal person** — you need them for Gate B, and
   finding out who they are takes longer than you expect.

**If it stalls, do not wait.** Partner with **one organization and its adviser** — an ICT or programming
club is the natural first mover. Run the loop for that club's events only. Smallest consent surface,
fastest real usage, and that adviser becomes the internal champion for a school-wide rollout. A
single-club pilot is a real pilot, not a consolation prize.

**If it fails outright**, the platform is school-agnostic by construction (`school_id` from day one).
Approach a second school with a demo that now has a real click-path behind it.

---

## 9. 🟡 Gate B — legal and ownership

**A hard blocker. No real learner data enters any environment until every box is ticked.** Not the
production database, not a staging copy, not a CSV on your laptop.

Start this paperwork **while Phases 5 and 6 are still being built.** It moves at the school's pace,
measured in weeks, and it is the one part of the plan that working faster does not accelerate.

- [ ] School DPO or focal person has reviewed the system
- [ ] **Data processing agreement signed** — school as controller, you as processor, naming purpose,
      retention, security measures and deletion obligations
- [ ] Privacy notice published in English and Filipino
- [ ] Guardian consent collected for every learner to be activated
- [ ] `consent_records` populated; activation refuses without it
- [ ] **Repository transferred to a school-owned GitHub organization** (D17)
- [ ] Supabase, Vercel and domain accounts transferred to school ownership; the custodian holds the
      credentials
- [ ] Custodian trained; admin manual handed over
- [ ] Backup, restore and export all demonstrated **to the custodian**, by them, not by you
- [ ] **Re-decide D32** — Claude's Supabase write access and PR self-merge (§4). Both were granted
      against a project holding only synthetic data; real rosters are a different calculation

**Two things to raise with the DPO specifically**, because they are decisions a controller should make
knowingly rather than inherit from an SQL comment:

- **D28** — a leaderboard row publishes display name, avatar, **grade level, section**, XP, rank and
  level title, school-wide to any authenticated learner. This is the widest publication of learner
  attributes in the product.
- **LRN handling** — stored only as an HMAC with a server pepper, in its own table, never returned below
  School Admin. Worth walking them through; it is the part that most reassures a DPO.

Gate B exists because, without a school research protocol behind it, nothing else establishes a lawful
basis for one person to hold a thousand minors' records. The repository transfer sits in the same gate
deliberately: a deferred transfer is precisely how *"no one maintains it after the team moves on"* — the
proposal's own High/High risk — comes true.

🤝 Claude can draft the privacy notice, the processor agreement outline, and the admin manual. **It
cannot sign anything, and it cannot decide what the school consents to.**

---

## 10. ⚪ Phase 5 — store accounts · **NOT NEEDED (D35)**

**Native packaging left MVP scope on 2026-09-23.** Nothing here is needed for the pilot: no Google Play
account, no Apple Developer account, no $99/year, and no child-directed store-policy review. Kept for
the day Phase 5 resumes. Both accounts take days to verify identity, so open them at the *start* of
that phase, not partway through it.

| | Google Play | Apple |
|---|---|---|
| Cost | $25, one-time | **$99/year, recurring** |
| Verification | Days | Days, sometimes longer |
| The policy that applies | **Play Families** | **Kids Category** |

**Settle the child-directed policy question at the start of Phase 5, not at submission.** A rejection
under these policies costs a full review round trip. The binding constraint: **no SDK that collects an
advertising identifier** — this is why nothing analytics-shaped gets added casually.

**R16 — Apple's annual fee is not in the ₱15,400 pilot budget.** Decide who pays before Phase 5 opens.
If it is unresolved, **Android ships alone** and iOS waits; that is a real, acceptable outcome, and
planning for it beats discovering it.

---

## 11. 🟡 Backup and restore

A Gate B deliverable, and the one most often configured and never tested.

```bash
npm run db:seed:demo    # locally, to have something to restore over
```

For Supabase: **Database → Backups** for the automatic daily backup on the free tier, plus a manual
`pg_dump` before anything structural.

**The acceptance criterion is "a restore has actually been performed", not "backups are configured".**
An untested backup is a belief, not a backup. Do this once before Gate B, with the custodian watching,
and note the date in `docs/PROGRESS.md`.

**Never commit a database dump.** It is on the never-commit list with `.env` files and consent scans.

---

## 12. Quick reference — where each secret lives

| | Your `.env.local` | Vercel | Supabase | The repo |
|---|---|---|---|---|
| `DATABASE_URL` | local Postgres | Supabase string | — | never |
| `SUPABASE_SERVICE_ROLE_KEY` | placeholder | real | issued here | never |
| `LRN_HMAC_PEPPER` | local dev value | real | — | never |
| `QR_SIGNING_PRIVATE_KEY` | empty until Phase 3 | real | — | **never, and never in a bundle** |
| `QR_SIGNING_PUBLIC_KEY` | Phase 3 | real | — | safe, but keep it with its pair |
| `SUPABASE_ACCESS_TOKEN` | shell env, for MCP | — | issued here | never |
| `HIRAYA_DEMO_SCHOOLS` | `halimbawa-demo` | `halimbawa-demo` | — | `.env.example` only |

**Never commit:** real learner data, `.env` files, the service-role key, the QR private key, database
dumps, guardian-consent scans, Android keystores, iOS provisioning profiles. When in doubt, it does not
go in the repo.

---

## 13. Related documents

| Document | When |
|---|---|
| [`docs/BUILD_GUIDE.md`](BUILD_GUIDE.md) | The build loop — what to prompt, how to review |
| [`docs/WORKSTREAMS.md`](WORKSTREAMS.md) | What is next and who owns it |
| [`docs/MILESTONE_ROADMAP.md`](MILESTONE_ROADMAP.md) | Phases, gates, the risk register |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | What to send a new contributor |
| [`docs/PRD.md`](PRD.md) | What you are pitching at Gate A, and the KPIs it is judged on |
