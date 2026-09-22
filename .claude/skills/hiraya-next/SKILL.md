---
name: hiraya-next
description: Report where Hiraya stands and exactly what to build next - current phase, what just landed, the next prompt-able tasks, what is blocked on the maintainer, and what is waiting on a merge. Use at the start of a session, after a PR merges, when asked "what's next", "where are we", or "what should I build".
---

# Hiraya — what's next

Answers one question: **what should I type next?** Ends with a literal line to type, never with a
survey of options.

## When to use

- At the start of any session in this repository
- After a PR merges or a task closes
- Whenever asked "what's next", "where are we", "what should I work on", "what's blocked"

Read-only. It never edits, commits, or builds. If the state it finds is wrong, it says so and
recommends `/hiraya-checkpoint` — it does not fix the board itself.

## Step 1 — gather state

Run these together; none depends on another:

```bash
git branch --show-current
git log --oneline -1 main
git status --porcelain
gh pr list --state open
```

Then read:

- `docs/WORKSTREAMS.md` §0 (the "You are here" block) and the open rows of the phase tables — a row is
  open when it is not struck through
- `docs/MILESTONE_ROADMAP.md` for the current phase's unticked acceptance criteria
- The newest entry of `docs/PROGRESS.md` — specifically its **Next** and **Flagged** sections

## Step 2 — reconcile before reporting

§0 is written by a past session and can be stale. Check it against what you just read, and **report
reality, not the block**:

| Check | If it disagrees |
|---|---|
| Does §0's "last landed" match `git log main`? | Report the real commit; note the block is stale |
| Are tasks §0 calls in-flight actually still open PRs? | A merged PR means those tasks landed — say so |
| Do open PRs exist that §0 does not mention? | List them; they are usually the real next action |
| Are there unticked acceptance criteria for a phase §0 calls done? | The phase is not done. Name the criteria |

If anything disagrees, add one line at the end: `The board is stale — run /hiraya-checkpoint.`

## Step 3 — classify every open task

Exactly four buckets. A task belongs to the **first** one that fits:

| Bucket | Test |
|---|---|
| ⏳ **WAITING** | Blocked by an unmerged PR or by another open task's output |
| ⛔ **BLOCKED ON YOU** | Lane **M** — needs an account, a secret, a payment, a deploy, or a conversation. Always cite the `docs/SETUP_GUIDE.md` section |
| ▶ **NEXT** | Every dependency has merged, Owner is `—` or the maintainer. Prompt-able right now |
| 📋 **QUEUED** | Everything else, behind a gate or a later phase. Count only |

A task waiting on a gate is QUEUED, never NEXT. Gates are not tasks and cannot be prompted past.

## Step 4 — report

This format, nothing extra. No preamble, no closing summary.

```
PHASE 0 · Foundation, design system, demo tenant
main @ 7dc124b · 4 tasks open

▶ NEXT (prompt these now)
  P-07  Delete the fixture seam                    Lane P
        say: "build P-07"

⛔ BLOCKED ON YOU (only you can do these)
  M-01  Apply schema to Supabase, deploy to Vercel
        → docs/SETUP_GUIDE.md §4–§5
        say: "walk me through M-01"

⏳ WAITING
  PR #10  P-06 mobile audit           CI green
  PR #11  Lane D D-01…D-05            CI green
  P-14 waits on P-07

📋 QUEUED  14 tasks in Phase 1, behind Gate A

──────────────────────────────────────────
→ Type:  merge the open PRs
```

Rules for the report:

- **At most three tasks under NEXT.** More than three is a menu, and a menu is what this skill exists
  to replace. Choose by critical path, then by what unblocks the most other tasks.
- **The final `→ Type:` line is mandatory** and is a single literal prompt. If the true next action is
  a maintainer task, the line is still a prompt — `walk me through M-01` — because being walked through
  it is something Claude can do.
- **Never invent a task id.** Every id comes from `docs/WORKSTREAMS.md`. If the right next action has no
  id, describe it in words and say it needs booking on the board.
- Keep phase-level commentary to the one header line. The roadmap already explains itself.

## Step 5 — when a phase is finished

If every acceptance criterion for the current phase is ticked and no tasks remain open, do not advance
on your own. Report:

```
PHASE 0 complete — every acceptance criterion ticked.

Next is GATE A (school buy-in), which is a decision, not a task.
→ docs/SETUP_GUIDE.md §8 · docs/MILESTONE_ROADMAP.md §3

→ Type:  /hiraya-checkpoint
```

A gate is passed by a human having a conversation. Never report a gate as buildable, and never suggest
starting the next phase's tasks while a gate between them is open.

## Related

| | |
|---|---|
| `docs/WORKSTREAMS.md` | The board this reads |
| `docs/BUILD_GUIDE.md` | What happens after the prompt is typed |
| `docs/SETUP_GUIDE.md` | Every maintainer-only task, by section |
| `/hiraya-checkpoint` | Writes the state this reads |
