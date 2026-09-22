import "server-only";

import type { Session } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/client";
import { HirayaError, errors } from "@/lib/errors";
import { log } from "@/lib/log";

import {
  callAwardCheckinXp,
  insertCheckin,
  profileIsInTenant,
  selectExistingCheckin,
  selectScanTarget,
  selectScannableEvents,
} from "./queries";
import type {
  CheckinResult,
  ListScannableEventsResponse,
  RecordCheckinBody,
  RecordCheckinResponse,
} from "./schema";

/**
 * Check-in business logic (FR-4.5, FR-4.9, D18, D24).
 *
 * This is the path the product's load-bearing claim runs through: *a point in
 * Hiraya means a teacher confirmed you were there.* Three rules hold it up, and
 * all three live below or in `src/db/rls/06_checkin_xp.sql`:
 *
 *   1. **The server decides whether a scan is inside the event window.** The
 *      device's opinion is advisory — it exists to give the officer instant
 *      feedback — and a device with a wrong clock must not be able to write
 *      attendance for an event that finished last week.
 *   2. **A replayed scan changes nothing** (R6). The `(event_id, profile_id,
 *      jti)` constraint absorbs it, and the officer is told "already checked
 *      in" rather than shown an error they did not cause.
 *   3. **The scan and its points commit together, or neither does** (D18). They
 *      are one transaction, and the officer's session has no other way into the
 *      ledger.
 *
 * Phase 0 scope (D24): the scanner is a simulate-scan button, so `profileId`
 * arrives from the officer's device. Phase 3 derives it from a verified Ed25519
 * token instead — that field changes from trusted-input to verified-fact, and
 * never the other way.
 */

/**
 * How far outside its own window a scan still counts.
 *
 * Officers open the gate before an assembly starts and stragglers arrive after
 * it ends, so the event's exact times are the wrong boundary. These are
 * deliberately generous: a rejected valid learner costs an officer a queue, and
 * the anti-farming guarantee does not rest on this number — it rests on one
 * award per learner per event (src/db/rls/06_checkin_xp.sql).
 */
export const SCAN_WINDOW_BEFORE_MS = 60 * 60 * 1000;
export const SCAN_WINDOW_AFTER_MS = 2 * 60 * 60 * 1000;

/**
 * How far a claimed scan time may sit either side of *server* time.
 *
 * These are the second half of the window check, and the half that was missing:
 * comparing `scannedAt` only against the event's own start and end made the
 * rule circular. A scan claimed inside the window of an event that finished
 * last term passed, because it was inside that window — so an officer could
 * backdate attendance into any past event of their own org, for a learner who
 * was never there, and the points would land in whichever season the timestamp
 * fell in.
 *
 * `AHEAD` is ordinary clock drift on a cheap device. `BEHIND` is the offline
 * allowance, and it is generous on purpose: a queued scan is supposed to sync
 * late (R6), so this cannot be tight without breaking the thing it protects. A
 * week is long enough for a device left in a drawer over a weekend and short
 * enough that last quarter's events are closed.
 */
export const SCAN_CLOCK_AHEAD_MS = 15 * 60 * 1000;
export const SCAN_MAX_SYNC_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Whether the server will accept a scan claimed at this moment.
 *
 * Pure, exported and unit-tested at the boundaries, because this is the rule a
 * drifting device clock runs into and the one an officer will phone about. The
 * device checks it too, for instant feedback — but only this answer decides
 * whether a row is written.
 *
 * `now` is a parameter rather than a call to `Date.now()` inside, so the rule
 * is testable at its edges and so it is obvious at every call site that server
 * time is part of the decision.
 */
export function isWithinScanWindow(
  scannedAt: Date,
  startsAt: Date,
  endsAt: Date,
  now: Date,
): boolean {
  const at = scannedAt.getTime();

  const insideEvent =
    at >= startsAt.getTime() - SCAN_WINDOW_BEFORE_MS &&
    at <= endsAt.getTime() + SCAN_WINDOW_AFTER_MS;

  const plausibleNow =
    at <= now.getTime() + SCAN_CLOCK_AHEAD_MS &&
    at >= now.getTime() - SCAN_MAX_SYNC_DELAY_MS;

  return insideEvent && plausibleNow;
}

/** The roles that may open a gate. RLS is still the guarantee; this names it. */
export const SCANNER_ROLES = [
  "org_officer",
  "org_adviser",
  "sslg_officer",
  "sslg_adviser",
  "school_admin",
] as const;

const SCHOOL_WIDE_ROLES = ["school_admin", "sslg_officer", "sslg_adviser"];

export async function recordCheckin(
  session: Session,
  body: RecordCheckinBody,
): Promise<RecordCheckinResponse> {
  const result = await withTenant(session, async (tx): Promise<CheckinResult> => {
    const event = await selectScanTarget(tx, body.eventId);
    if (!event) throw errors.notFound("event");

    /*
     * Attendance only exists for an event an adviser approved.
     *
     * Nothing else on this path checks it: `checkins_insert_hosts` asks for an
     * org grant, not a status, and the picker's `status = 'approved'` filter is
     * a listing decision. Without this an org officer — a learner — could scan
     * against their own org's draft or *rejected* proposal and mint points for
     * an event no adviser ever allowed, which is the approval gate itself
     * rather than the colluding-officer risk the threat model already accepts
     * (T2). `award_checkin_xp` refuses the award as well; this one is the good
     * error message, that one is the guarantee.
     */
    if (event.status !== "approved") {
      throw new HirayaError("EVENT_NOT_APPROVED", "This event has not been approved");
    }

    if (!(await profileIsInTenant(tx, body.profileId))) {
      throw errors.notFound("profile");
    }

    if (
      !isWithinScanWindow(new Date(body.scannedAt), event.startsAt, event.endsAt, new Date())
    ) {
      /*
       * Refused, and said out loud. The officer sees which event and why, so a
       * device with a wrong clock is discovered at the gate rather than
       * producing attendance nobody can explain later.
       *
       * Phase 3 owes this case more than a refusal: the roadmap requires an
       * out-of-window scan to be *flagged for adviser review*, which needs a
       * column on `checkins` to hold the flag and a screen to resolve it. Phase
       * 0 has neither, and inventing half of it would mean a row nobody can
       * clear.
       */
      log.warn("checkin.outside_window", {
        event_id: body.eventId,
        profile_id: body.profileId,
        scanned_at: body.scannedAt,
      });
      return {
        jti: body.jti,
        profileId: body.profileId,
        status: "rejected",
        checkinId: null,
        xpAwarded: 0,
        reason: "SCAN_OUTSIDE_EVENT_WINDOW",
      };
    }

    // Asked before the insert, because afterwards the answer is always yes.
    const existing = await selectExistingCheckin(
      tx,
      body.eventId,
      body.profileId,
      body.direction,
    );

    const checkinId = await insertCheckin(tx, session.schoolId, session.profileId, body);

    if (!checkinId) {
      /*
       * The unique constraint absorbed it: this exact scan has already been
       * recorded. A queue replaying itself lands here, which is precisely what
       * R6 asks for — and what makes it safe to retry a whole offline queue
       * without counting what got through the first time.
       */
      return {
        jti: body.jti,
        profileId: body.profileId,
        status: "duplicate",
        checkinId: existing?.id ?? null,
        xpAwarded: 0,
        reason: null,
      };
    }

    // The scan is real either way — a second gate, or a learner stepping back
    // in, is a thing that happened and the row records it. Whether it is worth
    // points is decided in SQL, once per learner per event.
    const xpAwarded = await callAwardCheckinXp(tx, checkinId);

    return {
      jti: body.jti,
      profileId: body.profileId,
      status: existing ? "duplicate" : "accepted",
      checkinId,
      xpAwarded,
      reason: null,
    };
  });

  log.info("checkin.recorded", {
    event_id: body.eventId,
    profile_id: body.profileId,
    status: result.status,
    xp_awarded: result.xpAwarded,
  });

  return { result };
}

export async function listScannableEvents(
  session: Session,
): Promise<ListScannableEventsResponse> {
  const schoolWide = session.roles.some((role) => SCHOOL_WIDE_ROLES.includes(role));
  const orgIds = [
    ...new Set(
      session.orgGrants
        .filter((grant) => grant.role === "org_officer" || grant.role === "org_adviser")
        .map((grant) => grant.orgId),
    ),
  ];

  const events = await withTenant(session, (tx) =>
    selectScannableEvents(tx, {
      orgIds,
      schoolWide,
      windowBeforeMs: SCAN_WINDOW_BEFORE_MS,
      windowAfterMs: SCAN_WINDOW_AFTER_MS,
    }),
  );

  return { events };
}
