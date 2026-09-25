import "server-only";

import { and, asc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { checkins, events, organizations, profiles } from "@/db/schema";
import type { TenantTransaction } from "@/lib/db/client";

import type { RecordCheckinBody, ScannableEvent } from "./schema";

/**
 * Reads and writes for check-in.
 *
 * Everything here runs inside one `withTenant` transaction, which is the whole
 * point: the attendance row and its ledger row commit together or not at all
 * (D18). A check-in that lands without its points, or points without the scan
 * that earned them, breaks the audit chain that makes the record worth keeping.
 */

export interface ScanTargetEvent {
  id: string;
  orgId: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
}

/**
 * The event being scanned into, read under RLS. Invisible is indistinguishable
 * from absent here as everywhere else (src/lib/errors.ts).
 */
export async function selectScanTarget(
  tx: TenantTransaction,
  eventId: string,
): Promise<ScanTargetEvent | null> {
  const [row] = await tx
    .select({
      id: events.id,
      orgId: events.orgId,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      status: events.status,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  return row ?? null;
}

/**
 * Whether this profile is a learner of the caller's own school.
 *
 * The check-in INSERT policy checks that the *row* carries the caller's
 * school_id — it cannot check that the profile it cites does, because the
 * foreign key on `checkins.profile_id` points at `profiles(id)` and knows
 * nothing about tenancy. Without this read, an officer could write attendance
 * in their own school citing another school's learner: junk rather than a leak
 * (the other school's policies still hide the row from everyone who could act
 * on it), but junk in the ledger is exactly what the ledger must not hold.
 *
 * The read is the check: `profiles_select_tenant` returns nothing for a profile
 * outside the caller's school.
 */
export async function profileIsInTenant(
  tx: TenantTransaction,
  profileId: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  return row !== undefined;
}

/**
 * This learner's existing check-in for this event and direction, if any.
 *
 * Two different questions share this one answer. Same `jti` means the officer's
 * device replayed a scan it had already sent, and nothing should be written
 * (R6). A different `jti` means a genuine second scan — at a second gate, or
 * after stepping out — which is recorded, and is worth no further points.
 *
 * It goes through `find_existing_checkin` rather than selecting the row,
 * because the session asking is often one that may not read it. An SSLG officer
 * may write attendance for any event in the school and may **not** read the
 * table school-wide: that plus the roster every learner can already see is the
 * non-participant list (src/db/rls/09_checkin_lookup.sql). The function answers
 * one yes/no about one named learner and returns no attendance detail, which is
 * all the gate needs to tell "already checked in" from "accepted".
 */
export async function selectExistingCheckin(
  tx: TenantTransaction,
  eventId: string,
  profileId: string,
  direction: "in" | "out",
): Promise<string | null> {
  const rows = await tx.execute(
    sql`select public.find_existing_checkin(${eventId}::uuid, ${profileId}::uuid,
                                           ${direction}::public.checkin_direction) as id`,
  );
  const parsed = z
    .object({ id: z.uuid().nullable() })
    .parse((rows as unknown as unknown[])[0]);
  return parsed.id;
}

/**
 * Writes the attendance row.
 *
 * `onConflictDoNothing` on (event_id, profile_id, jti) is the idempotency
 * guarantee, and it is a database constraint rather than the read above: the
 * read tells the officer what happened, the constraint is what makes a replayed
 * queue a no-op even if two replays arrive at once.
 *
 * Returns null when the constraint absorbed the insert.
 */
export async function insertCheckin(
  tx: TenantTransaction,
  schoolId: string,
  recordedBy: string,
  body: RecordCheckinBody,
): Promise<string | null> {
  const [row] = await tx
    .insert(checkins)
    .values({
      schoolId,
      eventId: body.eventId,
      profileId: body.profileId,
      jti: body.jti,
      scannedAt: new Date(body.scannedAt),
      syncedAt: new Date(),
      deviceId: body.deviceId ?? null,
      method: body.method,
      direction: body.direction,
      recordedBy,
    })
    .onConflictDoNothing({
      target: [checkins.eventId, checkins.profileId, checkins.jti],
    })
    .returning({ id: checkins.id });

  return row?.id ?? null;
}

/**
 * The single bridge from a verified scan to a point
 * (src/db/rls/06_checkin_xp.sql). Returns what was awarded, which is 0 when
 * this learner already has attendance points for this event.
 */
export async function callAwardCheckinXp(
  tx: TenantTransaction,
  checkinId: string,
): Promise<number> {
  const rows = await tx.execute(
    sql`select public.award_checkin_xp(${checkinId}::uuid) as awarded`,
  );
  const parsed = z
    .object({ awarded: z.number().int().nonnegative() })
    .parse((rows as unknown as unknown[])[0]);
  return parsed.awarded;
}

/**
 * The events this officer's device may open a gate for.
 *
 * The org filter is a *listing* decision, not the authorization: what a session
 * may actually write is decided by `checkins_insert_hosts`, and calling
 * `POST /checkins` for someone else's event fails at the policy whatever this
 * list said. It exists because a scanner that opens on every event in the
 * school is a scanner that checks learners into the wrong one
 * (features/checkin/schema.ts).
 */
export async function selectScannableEvents(
  tx: TenantTransaction,
  options: { orgIds: string[]; schoolWide: boolean; windowBeforeMs: number; windowAfterMs: number },
): Promise<ScannableEvent[]> {
  const now = new Date();

  if (!options.schoolWide && options.orgIds.length === 0) return [];

  const rows = await tx
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      venue: events.venue,
      orgName: organizations.name,
    })
    .from(events)
    .innerJoin(organizations, eq(organizations.id, events.orgId))
    .where(
      and(
        eq(events.status, "approved"),
        // Today's gate, and tomorrow's: an event that ended hours ago is not
        // something an officer is standing at, and one three days out is noise.
        gt(events.endsAt, new Date(now.getTime() - options.windowAfterMs)),
        lt(events.startsAt, new Date(now.getTime() + 24 * 60 * 60 * 1000)),
        options.schoolWide ? undefined : inArray(events.orgId, options.orgIds),
      ),
    )
    .orderBy(asc(events.startsAt))
    .limit(20);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    venue: row.venue,
    orgName: row.orgName,
    scannableNow:
      now.getTime() >= row.startsAt.getTime() - options.windowBeforeMs &&
      now.getTime() <= row.endsAt.getTime() + options.windowAfterMs,
  }));
}
