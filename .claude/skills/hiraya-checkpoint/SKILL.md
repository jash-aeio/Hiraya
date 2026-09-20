---
name: hiraya-checkpoint
description: Reconcile Hiraya's documentation with what was actually built, append a dated entry to docs/PROGRESS.md, run cross-document consistency checks, then commit and push. Use when a phase completes or a gate passes, a feature slice merges, a migration lands, a decision changes, a risk materializes or retires, or the stack changes.
---

# Hiraya checkpoint

Keeps documentation, the progress log, and the GitHub remote current. Run it on real milestones, not on
every commit.

## When to use — the six triggers

1. A roadmap phase completes, or a gate passes
2. A feature slice merges
3. A schema migration lands
4. A decision in the `docs/TECHNICAL_ARCHITECTURE.md` D-table is added or changed
5. A risk materializes or is retired
6. The stack or a dependency changes

Also invocable directly as `/hiraya-checkpoint`.

## Inputs required

- Git history since the last checkpoint (tag `checkpoint-*` or `phase-*-complete`)
- The current phase from `docs/MILESTONE_ROADMAP.md`

## Workflow

### 1. Establish what actually changed

```bash
git describe --tags --abbrev=0 --match 'checkpoint-*' 2>/dev/null || git rev-list --max-parents=0 HEAD
git log <last>..HEAD --oneline
git diff <last>..HEAD --stat
```

Read the diff. **Do not write a progress entry from memory** — memory reports intentions, the diff
reports what happened.

### 2. Map changes to the documents they affect

| Changed | Update |
|---|---|
| `src/db/schema.ts`, migrations | `SYSTEM_DESIGN.md` §4, `DATA_FLOW.md` |
| `/api/v1` routes | `SYSTEM_DESIGN.md` §5 |
| Scope: a feature added, cut, or moved between phases | `PRD.md` §4–5, `MILESTONE_ROADMAP.md` |
| Stack, dependency, or a new decision | `TECHNICAL_ARCHITECTURE.md` §2–3 |
| UI components, tokens, assets | `DESIGN_SYSTEM.md`, `ASSET_CHECKLIST.md` |
| Roles or permissions | `SYSTEM_DESIGN.md` §2, `PRD.md` §3 |
| A new rule future sessions must follow | `CLAUDE.md` |

### 3. Append to `docs/PROGRESS.md`

Newest first. Never edit a past entry — this log is append-only for the same reason the XP ledger is:
a record you can rewrite is a record nobody trusts.

```markdown
## YYYY-MM-DD — <short title>

**Phase:** N — <name> · **Status:** on track | slipping | blocked

**Shipped**
- <what actually works now, in user terms>

**Decisions**
- D<n>: <decision> — <one-line rationale>   (or "none")

**Docs updated**
- <file> — <what changed>

**Risks**
- Materialized: <risk> — <response>
- Retired: <risk> — <why>

**Next**
- <the next concrete thing>

**Flagged**
- <contradictions, open questions, anything a future session must not miss>
```

### 4. Consistency checks

```bash
grep -rn "Kasali" --include="*.md" . | grep -v '\.claude/skills'
```

The superseded working title is allowed in exactly four places, all of which name it *as* superseded:
`CLAUDE.md` §1, `docs/PRD.md` §4 (the superseded-delimitations table), `docs/PROGRESS.md` (the first
entry), and the `README.md` footnote. **Any fifth occurrence is a finding.** `kasali.ph` appears only
inside that PRD table row and nowhere else.

Then verify by reading:

- [ ] MVP feature list identical in `PRD.md` §4, `MILESTONE_ROADMAP.md` §14, `CLAUDE.md`
- [ ] Seven roles identical in `PRD.md` §3 and `SYSTEM_DESIGN.md` §2
- [ ] Entity names match between `SYSTEM_DESIGN.md` §4 and `DATA_FLOW.md`
- [ ] Design tokens identical in `DESIGN_SYSTEM.md` §2 and `ASSET_CHECKLIST.md`
- [ ] Every D-number referenced anywhere exists in the `TECHNICAL_ARCHITECTURE.md` table
- [ ] Phase numbering consistent across roadmap, PRD, and SKILLS.md
- [ ] Any Mermaid block added this checkpoint parses

**When documents disagree, report the contradiction. Never silently resolve it.** Record it under
**Flagged** and raise it. A doc set that quietly contradicts itself is worse than one that flags the
conflict, because trust in it decays invisibly and you discover the problem at the moment you were
relying on it.

### 5. Commit and push

Conventional commits. Reference PRD requirement IDs where they apply.

```bash
git add -A
git commit -m "docs: checkpoint - <summary>"
git push origin main
```

At a phase boundary, tag:

```bash
git tag -a phase-N-complete -m "Phase N: <name>"
git push origin phase-N-complete
```

**Git policy (D16).** Commit freely without asking. **Push at checkpoints, and say so in one line.**
Never force-push. Never commit directly to `main` without asking, if a branch workflow is in use.

### 6. Never commit

Real learner data · `.env` files · the Supabase service-role key · the QR Ed25519 **private** key ·
database dumps or exports · guardian-consent scans · Android keystores · iOS provisioning profiles.

Before pushing:

```bash
git diff --cached --name-only
```

Anything unexpected — stop and ask.

## Outputs

1. Updated documentation
2. A new `docs/PROGRESS.md` entry
3. A pushed commit, tagged at phase boundaries
4. **An explicit list of contradictions found**, or a statement that there were none

## Validation

- [ ] The progress entry reflects the diff, not intentions
- [ ] Every affected document updated
- [ ] Consistency greps return expected counts
- [ ] No secret or learner data staged
- [ ] Push confirmed and reported to the user in one line
- [ ] Contradictions reported rather than resolved
