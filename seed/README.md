# Demo seed data

The synthetic tenant behind the Phase 0 demo. Loaded by `npm run db:seed:demo`
(`scripts/seed-demo.ts`).

Everything here is fake and must stay fake. **No real learner data enters any
environment before Gate B** — not a real name, not a real section, not a real
school. The tenant is flagged `is_demo`, which is what drives the DEMO DATA
marker, and the seed refuses to run at all if any school in the database is not
so flagged.

## The files

| File | Holds |
|---|---|
| `demo-school.json` | The school, two seasons, the four levels, the FR-5 point values, four announcements |
| `demo-people.json` | 4 staff and 40 learners, with their school-wide roles |
| `demo-orgs.json` | 6 organizations — one per category — with advisers, officers, members and applicants |
| `demo-events.json` | 12 events, who registered, who was scanned in, the non-attendance awards, and one reversal |

Rows reference each other by short key (`l07`, `agham`, `e03`), never by UUID.
The script derives a stable UUID from each key, so editing a name updates that
person rather than creating a second one.

## Editing it before a pitch

Change the JSON and re-run. Three things are worth knowing first.

**Dates are relative.** `startsInDays` counts from the moment the seed runs, so
a demo rehearsed in September still looks alive in December. Exactly one event
carries `happeningNow`, which puts it an hour into its own window — that is the
event the scanner points at, and the demo is much weaker without one. The seed
refuses to run if a second event claims it.

**The live event stays live (D-07).** `happeningNow` also sets `demo_rolls_live`
on that row, and `public.demo_roll_live_events` re-centres its window on now
whenever a persona is picked — so a tenant seeded months ago still has something
an officer can open a gate for. Only the marked event moves, and only in a
school flagged `is_demo`; the past events the XP ledger cites stay where they
are. The window it lands on is still the real five hours this file asks for, so
a scan can still fall outside it — the scan rule itself was left alone.

**Re-running adds nothing.** `xp_ledger` has no DELETE grant for any role and a
trigger rejects the attempt even from the table owner, so there is no
teardown-and-rebuild and there never will be. Every row is keyed instead, and a
second run is a replay that changes nothing. A row you remove from the JSON is
therefore *not* removed from the database — to retire something, change it
rather than delete it.

**Point values are versioned, not edited.** Change an `xpValue` and the seed
inserts a new `xp_rules` row effective now, leaving the old one in place, so a
past award can still be explained by the rule that was in force when it was
made. Already-awarded XP does not move.

## What it deliberately does not seed

- **`profile_identifiers`.** Synthetic learners have no LRN. The table exists to
  de-duplicate a real roster import; seeding fake hashes would put a
  privacy-sensitive shape in the demo in exchange for nothing.
- **`leaderboard_snapshots`.** The board is computed from the ledger. A seeded
  snapshot is the one thing in the demo capable of disagreeing with the points
  it claims to summarise.
- **`devices`, `notifications`, `audit_log`.** Nothing in the demo reads them
  yet, and a fabricated audit trail is worse than an empty one.

## Names

Learner names are built from Filipino nature and virtue words rather than
plausible roster names, so no synthetic learner can be mistaken for a real one
in a screenshot. Keep it that way when you add to them.
