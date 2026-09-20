# Hiraya

A school engagement platform for a Philippine public high school. It turns co-curricular participation
into a verified, rewarded, and recorded thing.

```
Org proposes event → Adviser approves → Learners register → QR check-in verified
     → XP awarded → Leaderboard, badges, Co-curricular Record → back to registration
```

The load-bearing claim is simple: **a point in Hiraya means a teacher confirmed you were there.**

**Status:** Phase 0 — foundation. Schema, tenancy rules, and the `/api/v1` skeleton are in
place and tested; learner-facing screens arrive with the identity and events slices.

---

## What it does

- **Events** — organizations propose, advisers approve, learners register, attendance is QR-verified
- **Check-in** — officers scan learner digital IDs; **works with no signal** and syncs when it returns
- **Recognition** — XP on an append-only ledger, Filipino level titles, seasonal leaderboards at section,
  grade, organization, and school scope
- **Organizations** — profiles, officers, membership applications, and a Discover directory
- **For advisers** — approval in three taps, and accomplishment reports that write themselves
- **For guidance** — a confidential, audited list of learners participating in nothing, for outreach

Later phases add badges and quests, e-certificates and a Co-curricular Record spanning Grade 7 to Grade
12, a moderated community forum, and an Apps Hub of school services.

## Built as

One codebase → a web PWA **and** an installable Android/iOS app, sharing one database.

Next.js 16 (App Router) · TypeScript · Tailwind · Supabase (Postgres with row-level security, Auth,
Storage) · Drizzle · Capacitor · Vercel.

## Development

```bash
cp .env.example .env.local   # fill in Supabase URL, keys, and DATABASE_URL
npm install
npm run db:migrate           # schema + RLS policies, in that order
npm run db:verify-rls        # asserts the tenancy invariants landed
npm test                     # unit + integration, including cross-tenant denial
npm run dev
```

The integration suite needs a real Postgres, because RLS policies and GRANTs are what it tests. Set
`TEST_DATABASE_URL` to a throwaway database (Supabase local, or any Postgres) and it will use it;
leave it unset and the suite downloads and boots its own. See [`src/db/README.md`](src/db/README.md)
for the schema and policy workflow.

## Documentation

| Document | Contents |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Architecture rules, coding standards, and how to work in this repo |
| [`SKILLS.md`](SKILLS.md) | The five project skills and five project agents |
| [`docs/PRD.md`](docs/PRD.md) | Problem, personas, requirements, user stories, KPIs |
| [`docs/TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md) | Stack, decisions D1–D17, trade-offs |
| [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) | Modules, permissions, workflows, entities, API, threat model |
| [`docs/DATA_FLOW.md`](docs/DATA_FLOW.md) | Data lifecycle, auth flow, sensitive-data handling |
| [`docs/MILESTONE_ROADMAP.md`](docs/MILESTONE_ROADMAP.md) | 17 weeks, two gates, risk register |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Tokens, dual register, components |
| [`docs/ASSET_CHECKLIST.md`](docs/ASSET_CHECKLIST.md) | Every asset, tiered by what it blocks |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Append-only checkpoint log |
| [`src/db/README.md`](src/db/README.md) | Schema, migration, and RLS policy workflow |

## Privacy

Most users are minors. This is designed around that from the first commit, not retrofitted.

The school is the **data controller**; the developer is a **processor** under a written agreement.
Compliance target: the Data Privacy Act of 2012 (RA 10173) and DepEd child-protection policy.

- Collected: name, grade, section, school ID or LRN, organization memberships. **Nothing else** — no
  address, no birthday, no family data, no photographs of learners
- LRN is stored only as a keyed hash and is never shown to anyone but the School Admin
- Avatars are a curated illustrated set; **photo uploads do not exist**
- There is **no private messaging between learners and adults**, by design
- Every point traces to a verified action; the ledger cannot be edited, by anyone

**No real learner data enters any environment before Gate B** — DPO review, a signed processing
agreement, guardian consent collected, and the repository and infrastructure transferred to school
ownership.

## Sustainability

Built to outlive its author. The school owns the repository, the domain, and the data; a teacher holds
the admin account; an ICT club can inherit the codebase; and full data export is a first-class feature,
never a support request. Vendor lock-in is the failure mode this project is explicitly designed against.

---

*The working title in the original proposal was "Kasali".*
