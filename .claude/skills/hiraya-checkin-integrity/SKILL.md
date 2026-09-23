---
name: hiraya-checkin-integrity
description: Write correct code on the Hiraya QR to check-in to XP path - Ed25519 asymmetric signing, token expiry and clock skew, idempotent sync, append-only ledger, anti-farming. Use for any diff touching lib/qr, features/checkin, features/xp, the scanner, the sync endpoint, or the ledger schema.
---

# Hiraya check-in integrity

This path carries the product's load-bearing claim: **a point in Hiraya means a teacher confirmed you
were there.** Everything else — leaderboards, badges, the Co-curricular Record — is worthless the moment
that claim is falsifiable. Code here gets written deliberately.

## When to use

Any diff touching `src/lib/qr/`, `src/features/checkin/`, `src/features/xp/`, the scanner UI,
`/api/v1/checkins*`, or the `checkins` / `xp_ledger` / `xp_rules` schema.

## Inputs required

- The diff and which part of the path it touches
- `docs/SYSTEM_DESIGN.md` §3.2, §3.3 (workflows) and §10 (threats T2–T7)
- `docs/TECHNICAL_ARCHITECTURE.md` §7 (QR design and the skew trade-off)

## Workflow

### 1. Signing stays asymmetric

- Tokens are **Ed25519**, never HMAC or a symmetric scheme
- The **private key exists only in server environment settings** — never in the repo, never in a client
  bundle, never in a service-worker cache. Anything that reaches a device is public — a JS bundle is
  readable in devtools, and a native binary, if native ever resumes, is trivially unpacked
- Devices verify with the **public** key from `GET /checkin/public-key`, cached
- If a change would put a secret on a device, the change is wrong. There is no version of this that is
  acceptable "just for the scanner"

### 2. Token payload carries no PII

`{ sub, sid, exp, nonce, jti }` — profile id, school id, expiry, rotating nonce, token id. **No name, no
LRN, no section.** A photographed QR must reveal nothing about the learner holding it.

### 3. Expiry and clock skew

- Learner ID token: ~60s expiry, rotating. Short expiry is what defeats screenshot sharing
- Event token: 30s rotation
- Offline verification applies a **configurable skew tolerance** — cheap Android clocks drift, and a
  device five minutes fast would otherwise reject every valid learner
- **The server is authoritative.** It independently validates that `scanned_at` falls inside the event
  window. Device-side verification is advisory and exists to give the officer instant feedback
- A scan outside the window is **flagged for adviser review, never silently discarded** — discarding
  hides a misconfigured device

### 4. Idempotency

- The queue entry is `{jti, event_id, profile_id, scanned_at, device_id}`
- Server de-duplicates on **`(event_id, profile_id, jti)`** — a DB unique constraint, not an
  application-level check
- Replaying an entire queue must be a no-op
- `/checkins/sync` returns **per-item** results (`accepted` / `duplicate` / `rejected`), never a single
  all-or-nothing status — one bad scan must not reject 40 good ones
- A duplicate is **HTTP 200 with `xp_awarded: 0`**. It is not an error; the officer did nothing wrong

### 5. Ledger stays append-only

- `xp_ledger` has **no UPDATE and no DELETE grant, for any role, including School Admin**
- Corrections are new reversal rows with `reversal_of` set
- Every row carries `source_type` and `source_id` — every point traces to a verified action
- Balances come from the `xp_balances` view - a regular view declared `security_invoker = true`, never
  a materialized one (D19): a matview holds its own rows and cannot carry an RLS policy, so one would be
  readable across schools. **Never** compute from or store an editable total
- Dispute resolution writes a reversal row; it never edits history

### 6. Anti-farming

- XP is awarded on **confirmed check-in only** — never on registration (FR-4.9)
- `xp_rules` is writable by School Admin and the SSLG adviser only, never by an organization
- An adviser cannot approve their own drafted event
- After changing any rule or value, run `hiraya-gamification-balancer`

### 7. Tests, written with the code

- Unit: sign/verify round-trip; expired token rejected; wrong-school token rejected; tampered signature
  rejected; skew tolerance boundaries
- Integration: **replaying a full queue produces zero duplicate XP**; ledger UPDATE is denied;
  `scanned_at` outside the window is flagged
- Then hand to `hiraya-offline-scenario-tester` for the full network matrix

## Outputs

1. Code on the check-in path
2. Tests covering each property above
3. A statement of which threats (T2–T7) the change affects and whether residual risk moved

## Validation

- [ ] No private key reachable from any client bundle
- [ ] Token payload contains no PII
- [ ] Server validates `scanned_at` against the event window independently of the device
- [ ] `(event_id, profile_id, jti)` unique constraint exists in the schema
- [ ] Queue replay test passes
- [ ] No UPDATE or DELETE grant on `xp_ledger`
- [ ] Every ledger row has a source
- [ ] Duplicate returns 200, not an error
- [ ] Sync returns per-item results
- [ ] Scanner surfaces queue depth — never a silent failure, never a false success

## Boundary with the offline tester

This skill **writes** the code. `hiraya-offline-scenario-tester` **proves** it survives a hostile
network. Both are needed: writing it correctly and demonstrating it holds up are different jobs, and the
second should not be done by the reasoning that produced the first.
