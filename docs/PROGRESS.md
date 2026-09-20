# Hiraya — Progress Log

Append-only. Newest entry first. **Never edit a past entry** — this log is append-only for the same
reason the XP ledger is: a record you can rewrite is a record nobody trusts.

Maintained by the `hiraya-checkpoint` skill. See `CLAUDE.md` §7 for the six triggers.

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
