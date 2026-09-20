# Hiraya — Product Requirements Document

**Status:** Approved for Phase 0 · **Version:** 1.0 · **Last updated:** 2026-09-21

---

## 1. Background and problem statement

Philippine public high schools run a rich co-curricular life, and almost none of it is captured
digitally. DepEd's Learner Government Program formally establishes a **Supreme Secondary Learner
Government (SSLG)** in every secondary school, tasked with implementing programs, projects and
activities, crafting a General Plan of Action, and voicing learners' suggestions and grievances. The
structure is real and well-defined. The tooling is not.

In most schools, events are announced on Facebook pages and bulletin boards, attendance is taken on
paper, accomplishment reports are compiled by hand, and participation history disappears the moment
officers graduate.

Three contextual facts shape the whole design:

- **Learners are reachable on phones, not laptops.** Pandemic-era surveys found up to 89% of student
  respondents had a smartphone or tablet, while only about one in five online learners had a computer,
  with wide regional variation. Those figures are dated, so the pilot school should run its own device
  and connectivity survey before development — but the direction is not in doubt.
- **Policy is moving toward safer, more deliberate edtech.** DepEd Order No. 006, s. 2026 addresses a
  safe and motivating learning environment, an Omnibus Policy on EdTech is in consultation, and the
  National Privacy Commission has reminded DepEd offices to avoid over-collecting learner data. A
  platform built for minors must be designed around this from day one, not retrofitted.
- **Similar platforms exist, but not for this context.** 5-Star Students and Anthology Engage prove the
  model works. They are priced in US dollars, built for US schools and universities, and reflect
  neither SSLG structures, DepEd reporting, Filipino language, nor low-data mobile use.

### The eight problems

| # | Problem | Consequence |
|---|---|---|
| P1 | **Scattered information** — announcements spread across Facebook, group chats, bulletin boards | Learners miss activities they would have joined |
| P2 | **Unverified, manual attendance** — paper sheets | Slow, easy to falsify, hard to consolidate into reports |
| P3 | **Low and uneven participation** — a small group joins most activities | No data exists to identify or reach the rest |
| P4 | **Weak recognition** — rarely rewarded beyond occasional certificates | No incentive for sustained involvement |
| P5 | **No lasting record** | Learners cannot prove involvement for scholarships, college, or employment |
| P6 | **Low organization visibility** | Grade 7 and Grade 11 entrants cannot discover clubs or how to join |
| P7 | **Limited channels for student voice** | No safe, moderated space to ask for help or reach the SSLG |
| P8 | **No platform for future school services** | Ideas like a research repository have nowhere to live |

### What we learned from existing systems

- **Verification comes first.** Every successful platform ties points to confirmed check-in, never to
  registration. This is the single design lesson that matters most.
- **The record outlasts the game.** Anthology's co-curricular transcript is what students actually use
  in applications and interviews. It is what gives points durable value.
- **Depending on a vendor is risky.** Teachers lost Classcraft and years of content when it shut down in
  June 2024 after acquisition. A school-owned system with full data export avoids that.
- **Approval workflows win staff support.** Digitizing event review mirrors the adviser accountability
  DepEd already expects, so it reads as support rather than surveillance.
- **Gamification alone is not enough.** A meta-analysis of gamified learning (Sailer & Homner, 2020)
  found small positive effects on cognitive, motivational and behavioral outcomes — but effects on
  motivation and behavior were *less stable in the most rigorous studies*. Designs that added narrative
  and combined competition with collaboration were especially effective for behavioral outcomes. So
  Hiraya pairs individual rewards with team goals, meaningful quests, and real-world recognition — and
  explicitly watches for novelty drop-off after the first weeks.

---

## 2. Vision and goals

> **Vision.** Every learner leaves this school with a verified record of who they were outside the
> classroom — and every adviser spends less time on paperwork to make that true.

**Product goals**

| G | Goal | Addresses |
|---|---|---|
| G1 | One trusted place to discover and join school activities | P1, P6 |
| G2 | Attendance that is fast, verified, and impossible to fake casually | P2 |
| G3 | Recognition that is fair, visible, and motivating over a whole semester | P3, P4 |
| G4 | A portable co-curricular record spanning Grade 7 to Grade 12 | P5 |
| G5 | Less adviser paperwork than the paper process it replaces | P2 |
| G6 | A safe, moderated channel for student voice | P7 |
| G7 | A foundation the school can extend without rebuilding | P8 |

**Non-goals.** Hiraya is not a learning management system, not a gradebook, and not a replacement for
DepEd's Learner Information System.

---

## 3. Target users and personas

Seven roles. A learner can hold more than one — member of two organizations, officer of a third.

| Role | Who | Main permissions |
|---|---|---|
| **Learner** | Every enrolled student | Join events, check in, earn points, apply to orgs, download own record |
| **Org Officer** | Elected officers of an organization | Draft events, scan attendance, manage members and org profile, post org announcements |
| **Org Adviser** | Teacher assigned to an organization | Approve events and officers, moderate org boards, view org analytics |
| **SSLG Officer** | Elected SSLG members | All officer rights for SSLG, school-wide announcements, manage suggestion box |
| **Moderator** | Designated advisers and trained SSLG members | Review reports, hide posts, suspend forum access |
| **School Admin** | ICT coordinator or designated staff | Import learners, create orgs, assign advisers, set point rules, enable modules, view all analytics |
| **Super Admin** | Platform maintainers (later phases) | Create and manage school tenants |

Guidance staff get a **read-only analytics view** for outreach. School heads get the School Admin
dashboard **without editing rights**.

### Personas

**Ana, Grade 8 learner.** Has an Android phone on prepaid data, shared with a sibling some evenings.
Joined nothing last year because she never heard about anything until it was over. Wants to find things
that sound interesting without asking a stranger, and wants her mother to see she is doing something.
*Pain:* information arrives too late, and arriving alone to an event she found out about is intimidating.

**Miguel, Grade 11, Science Club president.** Runs four events a semester. Currently posts on Facebook,
chases his adviser for a signature, prints an attendance sheet, then spends an evening typing names into
an accomplishment report. *Pain:* the paperwork is longer than the event, and nothing he built carries
over when he graduates.

**Mrs. Reyes, Org Adviser, teaches five sections.** Supportive but genuinely out of hours. Signs event
forms during lunch. *Pain:* every new system she has been given added work and then was abandoned. She
will judge Hiraya entirely on whether her approval takes under a minute on her phone and whether the
accomplishment report writes itself.

**Mr. Santos, ICT coordinator / School Admin.** Will hold the admin account and, eventually, the
infrastructure. *Pain:* he has inherited abandoned systems before and is wary of becoming the only
person who knows how something works. Needs the import to be a spreadsheet, the manual to exist, and the
export to be real.

**Ms. Dela Cruz, guidance counselor.** Wants the list of learners who have participated in nothing —
not to discipline them, but to reach them. *Pain:* that list has never existed, and she is acutely aware
it would be harmful if it circulated.

**Joy, SSLG President.** Accountable for the General Plan of Action and its accomplishment report. Needs
school-wide reach and evidence at the end of the term. *Pain:* every officer turnover loses institutional
memory.

---

## 4. Scope

### In scope — MVP (Phase 1)

1. Admin-provisioned accounts with role-based access
2. Organization profiles and a Discover Orgs directory
3. Event proposal, adviser approval, registration, and QR check-in (online **and** offline)
4. XP, levels, and a seasonal leaderboard
5. School announcements and notifications (in-app and push)
6. Basic admin dashboard for participation data

### In scope — later phases

**Phase 2:** badges, quests, spendable credits and a rewards catalog; e-certificates with QR
verification and the Co-curricular Record; moderated community forum (*Tambayan*); Filipino locale.

**Phase 3:** Apps Hub modules — digital suggestion box, polls and SSLG elections, scholarship board,
research repository, peer tutoring match, lost and found; multi-school tenancy via per-school subdomains.

### Out of scope

- Grades, class attendance, or learning content. **Hiraya is not an LMS.**
- Online payments or fee collection.
- Integration with DepEd's Learner Information System. Learner lists are imported by the School Admin.
- Parent accounts.
- Long-term effects on academic performance — the pilot measures participation over one semester.

### Superseded proposal delimitations

Recorded so the change is deliberate rather than silent:

| Original delimitation | Status | Why |
|---|---|---|
| "Delivered as a PWA, not native apps" | **Superseded** | Web PWA *and* installable Android/iOS app via Capacitor (D11). Native camera is what the ≥15 check-ins/min target depends on |
| Academic evaluation apparatus (ISO/IEC 25010 instrument, SUS as research instrument, stratified sampling, weighted mean/SD, thematic analysis, five-person team) | **Removed** | This is a personal project, not a thesis. §13's targets survive as product KPIs (§9) |
| Working title "Kasali", `kasali.ph` | **Superseded** | The system is Hiraya |

---

## 5. Functional requirements

Traced to objectives (O1–O10) and problems (P1–P8). **M** = MVP, **2** = Phase 2, **3** = Phase 3.

### FR-1 Identity and access (O1, M)

| ID | Requirement |
|---|---|
| FR-1.1 | School Admin imports learners from CSV (name, grade, section, LRN or school ID). Import is idempotent — re-running it updates rather than duplicates |
| FR-1.2 | Each learner receives a username derived from (never equal to) their LRN, plus a one-time activation code distributed at homeroom |
| FR-1.3 | Account activation is blocked until a `consent_records` row exists for that learner |
| FR-1.4 | Seven roles with role-based access control; a user may hold multiple roles, org-scoped where relevant |
| FR-1.5 | Password reset for learners is adviser- or admin-assisted via a fresh activation code (learners have no email) |
| FR-1.6 | Staff accounts use real email addresses with standard self-service reset |
| FR-1.7 | LRN is stored only as an HMAC and is never returned to any role below School Admin |

### FR-2 Organizations (O4, M — transparency board Phase 2)

| ID | Requirement |
|---|---|
| FR-2.1 | Org profile: mission, logo, adviser, officer list with term of office |
| FR-2.2 | Upcoming and past events pulled automatically from the events module |
| FR-2.3 | Gallery, achievements, and awards |
| FR-2.4 | Online membership application with officer review |
| FR-2.5 | **Discover Orgs** directory with category filters: academic, arts, sports, service, faith-based, special interest |
| FR-2.6 | Optional transparency board for collections, expenses, and financial reports *(Phase 2)* |

### FR-3 Events (O1, M)

| ID | Requirement |
|---|---|
| FR-3.1 | Officers draft an event; the org adviser approves it. SSLG-wide events additionally require SSLG adviser approval |
| FR-3.2 | An event is invisible to learners until approved |
| FR-3.3 | Registration with capacity limits, eligibility filters (grade, section, members-only), waitlist, and reminders |
| FR-3.4 | School-wide calendar that flags scheduling conflicts between organizations |
| FR-3.5 | Post-event: short feedback survey and photo upload |
| FR-3.6 | Accomplishment report auto-generated from attendance, photos, and feedback; exportable as PDF |
| FR-3.7 | Adviser approval is reachable in **three taps or fewer** from a notification |

### FR-4 Attendance and check-in (O2, M)

| ID | Requirement |
|---|---|
| FR-4.1 | Each learner has a digital ID rendering an Ed25519-signed QR that rotates roughly every 60 seconds |
| FR-4.2 | **Primary path:** officers scan the learner's digital ID |
| FR-4.3 | **Fallback path:** learners scan a rotating event QR displayed at the venue |
| FR-4.4 | Officer devices verify signatures **offline** using a cached public key |
| FR-4.5 | Scans made offline queue locally and sync on reconnect |
| FR-4.6 | Sync is idempotent — replaying a full queue creates no duplicate check-in or XP |
| FR-4.7 | Optional check-out scanning for long activities |
| FR-4.8 | Sustained throughput of **≥15 check-ins per minute** at a single entrance |
| FR-4.9 | XP is awarded only on confirmed check-in, never on registration |

### FR-5 Points, levels and leaderboards (O3, M — badges/quests/credits Phase 2)

| ID | Requirement |
|---|---|
| FR-5.1 | Two currencies: **XP** (never decreases; drives levels, badges, leaderboards) and **Credits** (spendable in the rewards catalog) |
| FR-5.2 | All XP is stored as individual ledger transactions, never an editable total |
| FR-5.3 | Point values are set by the SSLG adviser and School Admin — **never by individual organizations** |
| FR-5.4 | Levels carry Filipino titles: Kasapi, Lingkod, Tagapagtaguyod, Bayani |
| FR-5.5 | Seasonal leaderboards reset each quarter; lifetime XP is kept separately |
| FR-5.6 | Leaderboard scopes: section, grade level, organization, school-wide |
| FR-5.7 | Section-vs-section and grade-level team standings, to pair competition with collaboration |
| FR-5.8 | Learners may hide themselves from public boards; everyone always sees their own rank |
| FR-5.9 | "Most Improved" recognition rewards growth, not volume |
| FR-5.10 | **No daily login streaks** — deliberately excluded to avoid anxiety-driven use and wasted mobile data |
| FR-5.11 | Point disputes are filed in-app and resolved by the relevant adviser within one week |
| FR-5.12 | Badges, quests, credits, and rewards catalog *(Phase 2)* |

**Starting XP values** (set by the Steering Group; tuned during the pilot):

| Participation type | XP |
|---|---|
| Attend an event | 10 |
| Complete post-event feedback | 3 |
| Volunteer or perform at an event | 25 |
| Serve as event committee member | 40 |
| Organize or lead an event | 50 |
| Represent the school in an external competition | 60 |

### FR-6 Announcements and notifications (M)

| ID | Requirement |
|---|---|
| FR-6.1 | School and organization announcements in a single feed |
| FR-6.2 | In-app and push notifications for approvals, reminders, and awards |
| FR-6.3 | Share links that preview cleanly on Facebook and Messenger |
| FR-6.4 | Notification preferences per category, with a quiet-hours default |

### FR-7 Analytics (O8, M)

| ID | Requirement |
|---|---|
| FR-7.1 | Participation rates by grade, section, and organization |
| FR-7.2 | Most and least active organizations and event types |
| FR-7.3 | **Confidential list of learners with no participation, visible only to guidance staff and advisers**, for supportive outreach |
| FR-7.4 | Exportable summaries for SSLG reports and school planning |
| FR-7.5 | Full data export by School Admin at any time, in an open format — no lock-in |

### FR-8 Recognition artifacts (O6, Phase 2)

| ID | Requirement |
|---|---|
| FR-8.1 | Downloadable Co-curricular Record of events, roles, badges, and awards, Grade 7 to Grade 12 |
| FR-8.2 | Each certificate and record carries a QR linking to a public verification page |
| FR-8.3 | Learners choose which entries appear on the version they share |

### FR-9 Community forum — *Tambayan* (O5, Phase 2)

| ID | Requirement |
|---|---|
| FR-9.1 | Categories: announcements, academic help (peer Q&A by subject), SSLG suggestions, org boards, general |
| FR-9.2 | Upvotes and "accepted answer" in academic help, with small XP for helpful answers |
| FR-9.3 | Reporting, profanity filtering covering **Filipino and Taglish**, and post approval for new accounts |
| FR-9.4 | Anonymous posting in selected boards only, with identity always visible to moderators |
| FR-9.5 | Community guidelines accepted at first login |
| FR-9.6 | One-tap reporting for bullying, harassment, and inappropriate content |
| FR-9.7 | Serious reports escalate to the school's Child Protection Committee |
| FR-9.8 | **No private one-to-one messaging between learners and adults** |

### FR-10 Apps Hub (O7, Phase 3)

| ID | Requirement |
|---|---|
| FR-10.1 | Each app is a module the School Admin switches on or off, with its own permissions, sharing accounts and notifications |
| FR-10.2 | Phase 2 module: digital suggestion box with public status tracking |
| FR-10.3 | Phase 3 modules: polls and SSLG elections (one verified vote per learner, audit logs, adviser oversight), scholarship board, research repository, peer tutoring match, lost and found |

---

## 6. Non-functional requirements

| ID | Requirement | Verification |
|---|---|---|
| NFR-1 | **First load ≤ 500 KB**; lazy loading; compressed images | Playwright `browser_network_requests` in CI |
| NFR-2 | **WCAG 2.1 Level AA** — contrast, font size, screen reader support | `browser_snapshot` a11y tree in `hiraya-mobile-audit` |
| NFR-3 | **Mobile-first**, usable at 360×800 on a budget Android device | Playwright at 360×800 |
| NFR-4 | **Offline check-in** — officers scan without signal; scans sync on reconnect | `hiraya-offline-scenario-tester` |
| NFR-5 | **Bilingual** English and Filipino. i18n scaffolding from commit 1; Filipino locale Phase 2 | Lint rule bans bare JSX strings |
| NFR-6 | **Tenancy-ready** — every core table carries `school_id`; RLS enforced | `hiraya-tenancy-auditor`; cross-tenant denial test |
| NFR-7 | **Auditability** — every point traces to a verified action; every admin action logged | Append-only ledger; `audit_log` |
| NFR-8 | HTTPS everywhere, hashed passwords, encrypted backups | `/security-review` |
| NFR-9 | ≥15 check-ins/minute sustained at one entrance | Load test, Phase 6 |
| NFR-10 | Installable from Play Store and App Store; web PWA installable without a store | Phase 5 |
| NFR-11 | Runs within free hosting tiers during the pilot | Usage monitoring |
| NFR-12 | Full data export in an open format, on demand | FR-7.5 |

---

## 7. User stories with acceptance criteria

> **US-1 — Discover an activity.** *As Ana, I want to see what is happening at school this week, so I
> stop finding out after the fact.*
> - Home shows approved upcoming events, soonest first, with date, org, and remaining capacity
> - Filterable by org category and grade eligibility
> - Unapproved and past events never appear
> - Loads in under 3 seconds on a throttled 3G connection

> **US-2 — Register and get reminded.** *As Ana, I want to register and be reminded, so I do not forget.*
> - Registering is one tap; state changes immediately
> - Registering a full event offers the waitlist instead
> - A reminder arrives the day before and one hour before
> - Ineligible learners see why, not a generic failure

> **US-3 — Propose an event.** *As Miguel, I want to propose an event and know where it stands.*
> - Draft saves without being submitted
> - On submit, the org adviser is notified and status becomes Pending
> - A schedule conflict with another org is flagged before submission
> - Rejection requires a reason, shown to the officer
> - Miguel can see status at any time without asking anyone

> **US-4 — Approve in under a minute.** *As Mrs. Reyes, I want to approve from my phone between classes.*
> - A push notification deep-links to the approval screen
> - Approve or reject is reachable in **≤3 taps** from the notification
> - The screen shows everything needed to decide without navigating away
> - Approving triggers publication and notifies registrants
> - **Acceptance gate:** validated by `hiraya-adviser-advocate` against the paper process it replaces

> **US-5 — Check in at the gate.** *As Miguel, I want to scan arrivals quickly, even with no signal.*
> - Scanner opens in under 2 seconds and stays open between scans
> - A valid scan confirms in under 500 ms with distinct visual **and** audio feedback
> - With no connection, scans queue locally and the UI says so plainly, showing the queue count
> - On reconnect the queue syncs automatically; duplicates are discarded silently
> - An expired, malformed, or wrong-event token is rejected with a clear reason
> - Sustains ≥15 scans/minute

> **US-6 — Earn recognition I can see.** *As Ana, I want to see what I earned and where I stand.*
> - XP appears within seconds of a synced check-in, with a visible source ("Attended Science Fair")
> - Profile shows level, title, XP progress to next level, and events attended
> - Leaderboard is viewable by section, grade, org, and school
> - Ana can hide herself from public boards and still see her own rank
> - Every XP entry traces to a specific verified action

> **US-7 — Stop retyping the report.** *As Miguel, I want the accomplishment report generated for me.*
> - After an event, a report generates from attendance, photos, and feedback
> - Exportable as PDF in the school's expected shape
> - Attendance is exportable as CSV
> - **Acceptance gate:** measurably faster than the paper process, per `hiraya-adviser-advocate`

> **US-8 — Reach the disengaged.** *As Ms. Dela Cruz, I want to know who has joined nothing.*
> - Lists learners with zero verified check-ins this quarter
> - Visible **only** to guidance staff and advisers; invisible to officers and other learners
> - Every access to this list is written to `audit_log`
> - Framed for outreach, never ranked as a deficiency table

> **US-9 — Onboard the school.** *As Mr. Santos, I want to get everyone in without manual typing.*
> - CSV import with a documented template and clear per-row errors
> - Re-running the import updates rather than duplicates
> - Activation codes generate in printable per-section batches
> - No account activates without a consent record
> - Full export available at any time

> **US-10 — Prove involvement.** *(Phase 2) As a Grade 12 learner, I want a record for my scholarship
> application.*
> - Record spans Grade 7 to Grade 12: events, roles, badges, awards
> - Learner selects which entries appear on a shared version
> - Carries a QR linking to a public verification page
> - The verification page shows only what the learner chose to share

---

## 8. MVP and post-MVP

**Definition of MVP Complete** — all seven must hold:

1. A learner can discover, register for, attend, and be verified at an event, and see XP that traces to
   that check-in
2. An officer can propose an event and an adviser can approve it in ≤3 taps from a notification
3. Officers can check learners in **with no connectivity** and the queue syncs without duplicates
4. A School Admin can import learners, generate activation codes, and export all data
5. Cross-tenant denial and idempotent-sync tests pass (CLAUDE.md §5)
6. WCAG 2.1 AA, ≤500 KB first load, ≥15 check-ins/min verified
7. Web PWA and Android/iOS builds ship from one codebase against one database

**Post-MVP.** Phase 2: badges, quests, credits and rewards, e-certificates, Co-curricular Record,
*Tambayan* forum, suggestion box, Filipino locale. Phase 3: elections, scholarship board, research
repository, peer tutoring, lost and found, multi-school subdomains, division-level dashboards.

---

## 9. Success metrics

Product KPIs, measured at the end of the one-semester pilot. Participation is compared against the
previous semester's paper records where available.

| Metric | Target |
|---|---|
| Learners who activated accounts | 80% of enrolled |
| Monthly active learners | 50% of activated |
| Learners with ≥1 verified check-in | 60% |
| Events run through Hiraya | 75% of all org and SSLG events |
| Advisers actively approving events | 90% of org advisers |
| Check-ins processed per minute at the entrance | ≥15 |
| Forum reports resolved within 24 school hours *(Phase 2)* | 90% |
| Adviser time per event vs. paper baseline | Lower — measured, not assumed |

**Health signals to watch, not targets:** weekly-active decay after week 3 (the novelty drop-off the
literature predicts); share of XP earned by the top 10% of learners (if it climbs, the leaderboard is
discouraging the people it was meant to reach); check-in-to-registration ratio (a sudden rise suggests
farming).

**Lightweight usability check.** A short in-app SUS survey may be run at the end of the pilot as a
product health signal. It is not a research instrument and carries no thesis obligations.

---

## 10. Assumptions, constraints, dependencies, risks

**Assumptions.** *(Each is a belief that could be wrong — marked where it should be verified.)*

| # | Assumption | Verify by |
|---|---|---|
| A1 | Most learners have smartphone access at least sometimes | School device survey, Phase 0 |
| A2 | Venue connectivity is unreliable — hence offline-first check-in | Same survey |
| A3 | Officers own devices capable of scanning QR | Phase 0 |
| A4 | The school will designate an ICT coordinator as custodian | Gate A |
| A5 | Guardian consent can be collected through the school's existing channel | Gate B |
| A6 | The school has a DPO or focal person able to review | Gate B |
| A7 | Advisers will adopt if approval is genuinely faster than paper | Pilot, and `hiraya-adviser-advocate` before it |

**Constraints.** ~₱15,400 pilot budget; free hosting tiers; one developer; 17 weeks to launch plus a
one-semester pilot; mobile-first on budget Android; ≤500 KB first load; WCAG 2.1 AA; RA 10173 and DepEd
child-protection compliance.

**Dependencies.** School head approval (Gate A); DPO review, signed processor agreement, and guardian
consent (Gate B); an accurate learner roster from the school; Supabase and Vercel free tiers; Google
Play and Apple developer accounts (Phase 5); an ICT coordinator willing to be custodian.

**Risks.** Full register with likelihood, impact, and mitigation in `docs/MILESTONE_ROADMAP.md` §7. The
five that most deserve attention:

| Risk | L | I | Mitigation |
|---|---|---|---|
| **School declines or stalls** | Med | High | Demo tenant before the pitch; single-club fallback at Gate A |
| Learners farm points without real participation | High | High | Verified check-in only, rotating signed tokens, officer scanning, ledger audits |
| No one maintains the system after the developer moves on | High | High | Documentation, school-owned repo (Gate B), ICT club custodian, full export |
| Advisers see it as extra work | Med | High | Auto-generated reports; `hiraya-adviser-advocate` gates every adviser flow |
| Novelty wears off after a few weeks | High | Med | Quarterly seasons, rotating quests, team competition, real-world recognition |

---

## 11. Out of scope for this document

Technology choices and their justification → `docs/TECHNICAL_ARCHITECTURE.md`. Module internals, API
contracts, and the permission matrix → `docs/SYSTEM_DESIGN.md`. Data lifecycle and auth flow →
`docs/DATA_FLOW.md`. Schedule and gates → `docs/MILESTONE_ROADMAP.md`. Visual language →
`docs/DESIGN_SYSTEM.md`.
