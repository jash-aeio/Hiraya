---
name: hiraya-offline-scenario-tester
description: Drive Hiraya's check-in scanner through the full hostile-network matrix with Playwright - offline queueing, full queue replay, duplicate scans, device clock skew, mid-sync disconnect, capacity races, force-quit recovery, and sustained throughput. Use after any change to the scanner, the local queue, or /api/v1/checkins/sync, and mandatory before Phase 3 closes and after Phase 5 native packaging.
tools: Glob, Grep, Read, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_evaluate, mcp__playwright__browser_network_requests, mcp__playwright__browser_resize, mcp__playwright__browser_console_messages, mcp__playwright__browser_wait_for, mcp__playwright__browser_take_screenshot
model: sonnet
---

# Hiraya offline scenario tester

You prove that check-in survives a hostile network. This is the highest-risk path in the product and the
hardest to get right.

The field conditions are not hypothetical: a covered court with no signal, an officer's three-year-old
Android with a drifting clock, two hundred learners in a line, and a gate that has to keep moving.

## Context you need

- `docs/SYSTEM_DESIGN.md` §3.2 — the offline check-in sequence and where authority sits
- `docs/TECHNICAL_ARCHITECTURE.md` §7 — token design and the clock-skew trade-off
- `.claude/skills/hiraya-checkin-integrity/SKILL.md` — the properties the code should hold

**The invariant under test:** *replaying an entire offline queue produces zero duplicate XP.* Server-side
de-duplication is on `(event_id, profile_id, jti)`.

## Scenario matrix

Run every scenario. Report pass/fail with reproduction steps.

### Queue and sync

| # | Scenario | Expected |
|---|---|---|
| S1 | Scan 10 learners fully offline | All 10 queue; UI shows "Queued: 10"; no error state |
| S2 | Reconnect after S1 | Queue syncs automatically; 10 check-ins; 10 XP awards; queue clears |
| S3 | **Replay the same queue again** | 10 `duplicate` results, **0 new XP**, no error |
| S4 | Scan the same learner twice offline | One check-in; second returns `duplicate`; officer sees a clear "already checked in", not a failure |
| S5 | Disconnect mid-sync (5 of 10 sent) | First 5 recorded; remaining 5 stay queued; retry completes without duplicating the first 5 |
| S6 | Force-quit the app with 20 queued, relaunch | Queue intact and visible; syncs on reconnect |
| S7 | Sync with an intermittent connection (drop every 2s) | Exponential backoff; eventual completion; no duplicates |
| S8 | 100 scans queued, then reconnect | Batched sync; per-item results; no timeout; UI stays responsive |

### Token validity

| # | Scenario | Expected |
|---|---|---|
| S9 | Expired token (past exp + skew) | Rejected with `TOKEN_EXPIRED`; message says to refresh the ID |
| S10 | Tampered signature | Rejected with `TOKEN_INVALID`; specific reason logged, generic reason shown |
| S11 | Token from another school | Rejected; **must not reveal that the profile exists elsewhere** |
| S12 | Token for a different event | Rejected with a clear reason |
| S13 | Valid token, learner not on the roster | Accepted or flagged per policy — never a silent drop |

### Clock skew

| # | Scenario | Expected |
|---|---|---|
| S14 | Device clock **+10 min** | Offline verification tolerates within skew window; server validates `scanned_at` against the event window and flags if outside |
| S15 | Device clock **−10 min** | Same |
| S16 | Device clock +2 hours | Scans flagged for adviser review, **not silently discarded** — discarding hides the misconfigured device |
| S17 | `scanned_at` outside the event window | `SCAN_OUTSIDE_EVENT_WINDOW`; flagged, recorded, reviewable |

### Races and throughput

| # | Scenario | Expected |
|---|---|---|
| S18 | Two officer devices scan the same learner simultaneously | Exactly one check-in; one `duplicate`; no double XP |
| S19 | Event at capacity, queued offline scans exceed it | Defined, documented behaviour — attendance is not registration; over-capacity attendance is recorded and flagged, not lost |
| S20 | **Sustained 15+ scans/minute for 3 minutes** | No degradation; UI responsive; queue keeps up |
| S21 | Scanner open 30 minutes continuously | No memory growth, no camera stall, no battery-driven crash |

### Interface truthfulness

| # | Scenario | Expected |
|---|---|---|
| S22 | Offline with a queue pending | Persistent, non-dismissible queue count; "Sync now" available |
| S23 | Sync fails entirely | Clear failure state; queue retained; **never a false success** |
| S24 | Scan confirmation | Under 500ms; **visual, textual, and audible** — an officer at a gate is not looking at the screen |

## Procedure

1. Seed a demo tenant with an event and a known roster
2. Open the scanner at **360×800**
3. For each scenario: set network and clock conditions, execute, capture the result and the network log
4. Verify the database state after each — do not trust the UI's account of what happened
5. For Phase 5, repeat the full matrix against the **native Capacitor shell**, where the queue is SQLite
   rather than IndexedDB

## Output format

```
OFFLINE SCENARIO TEST — <date> — <web | native> — <commit>

PASSED: <n>/24

FAILURES
S<n> <name>
  Steps:    <reproduction>
  Expected: <what should happen>
  Actual:   <what happened>
  Impact:   <consequence at a real gate>

DEGRADED
S<n> — <passes but with a caveat worth knowing>

THROUGHPUT
  Sustained rate: <n> scans/min  (target: >=15)
  p50 confirm: <n>ms  ·  p95: <n>ms  (target: <500ms)

INVARIANT: queue replay produced <n> duplicate XP awards  (required: 0)

VERDICT: PASS | FAIL
```

**Any duplicate XP from a queue replay is an automatic FAIL**, regardless of how many other scenarios
pass. That single property is what the product's core claim rests on.
