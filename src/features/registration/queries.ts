import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { checkins, eventRegistrations, events, profiles } from "@/db/schema";
import type { TenantTransaction } from "@/lib/db/client";

import type { ListRosterQuery, RosterEntry } from "./schema";

/**
 * Reads and writes for the registration feature.
 *
 * The two writes are function calls, not INSERTs, and that is the whole design
 * of D-01: capacity is a race, so the count and the write happen together under
 * an event row lock inside `public.register_for_event`
 * (src/db/rls/05_registration.sql). A query builder cannot hold a lock across
 * two statements; the database can.
 *
 * The roster read below is an ordinary query under RLS, because it is an
 * ordinary read: `event_registrations_select_self_or_hosts` already restricts
 * it to the hosting org's officers and advisers, and nothing here re-states
 * that.
 */

/**
 * Parsed rather than cast. `tx.execute` returns `unknown`, and a change to the
 * function's shape should fail here — at the boundary, loudly — rather than
 * three layers up as an undefined field on a screen.
 */
const registrationOutcomeRow = z.object({
  r_outcome: z.enum([
    "registered",
    "waitlisted",
    "cancelled",
    "event_full",
    "not_eligible",
    "not_found",
  ]),
  r_status: z.enum(["registered", "waitlisted", "cancelled"]).nullable(),
  r_waitlist_position: z.number().int().positive().nullable(),
  r_registered_at: z.date().nullable(),
  r_detail: z.record(z.string(), z.unknown()).default({}),
});

export type RegistrationOutcome = z.infer<typeof registrationOutcomeRow>;

const cancelOutcomeRow = registrationOutcomeRow
  .omit({ r_detail: true })
  .extend({ r_promoted_profile_id: z.uuid().nullable() });

export type CancelOutcome = z.infer<typeof cancelOutcomeRow>;

export async function callRegisterForEvent(
  tx: TenantTransaction,
  eventId: string,
  acceptWaitlist: boolean,
): Promise<RegistrationOutcome> {
  const rows = await tx.execute(
    sql`select * from public.register_for_event(${eventId}::uuid, ${acceptWaitlist}::boolean)`,
  );
  return registrationOutcomeRow.parse((rows as unknown as unknown[])[0]);
}

export async function callCancelRegistration(
  tx: TenantTransaction,
  eventId: string,
): Promise<CancelOutcome> {
  const rows = await tx.execute(
    sql`select * from public.cancel_event_registration(${eventId}::uuid)`,
  );
  return cancelOutcomeRow.parse((rows as unknown as unknown[])[0]);
}

export interface RosterRead {
  entries: RosterEntry[];
  registeredCount: number;
  capacity: number | null;
}

/**
 * The roster an officer reads at the gate.
 *
 * `checkedInAt` comes from a LEFT JOIN on `checkins` scoped to `direction =
 * 'in'`: the scanner greys a row out once the learner is through the gate, and
 * an exit scan is not that.
 *
 * `registeredCount` counts the rows this caller can see, which for an officer
 * of the hosting org is all of them. It is not published to learners anywhere —
 * `features/events/schema.ts` says why — and this endpoint is not reachable by
 * one.
 */
export async function selectRoster(
  tx: TenantTransaction,
  eventId: string,
  query: ListRosterQuery,
): Promise<RosterRead | null> {
  const [event] = await tx
    .select({ id: events.id, capacity: events.capacity })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  // Invisible under the events policy is indistinguishable from absent, and
  // deliberately so (src/lib/errors.ts).
  if (!event) return null;

  const rows = await tx
    .select({
      profileId: profiles.id,
      displayName: profiles.displayName,
      avatarKey: profiles.avatarKey,
      gradeLevel: profiles.gradeLevel,
      section: profiles.section,
      status: eventRegistrations.status,
      waitlistPosition: eventRegistrations.waitlistPosition,
      checkedInAt: checkins.scannedAt,
    })
    .from(eventRegistrations)
    .innerJoin(profiles, eq(profiles.id, eventRegistrations.profileId))
    .leftJoin(
      checkins,
      and(
        eq(checkins.eventId, eventRegistrations.eventId),
        eq(checkins.profileId, eventRegistrations.profileId),
        eq(checkins.direction, "in"),
      ),
    )
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        query.status ? eq(eventRegistrations.status, query.status) : undefined,
      ),
    )
    // Seats first, then the waitlist in its own order, then names. Postgres
    // sorts an enum by the order its values were declared, and
    // `registration_status` is declared registered → waitlisted → cancelled,
    // which is exactly the order an officer reads at the gate.
    .orderBy(
      asc(eventRegistrations.status),
      asc(eventRegistrations.waitlistPosition),
      asc(profiles.displayName),
    )
    .limit(query.limit);

  const [counted] = await tx
    .select({ registered: sql<number>`count(*)::int` })
    .from(eventRegistrations)
    .where(
      and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "registered")),
    );

  return {
    entries: rows.map((row) => ({
      profileId: row.profileId,
      displayName: row.displayName,
      avatarKey: row.avatarKey,
      gradeLevel: row.gradeLevel,
      section: row.section,
      status: row.status,
      waitlistPosition: row.waitlistPosition,
      checkedInAt: row.checkedInAt?.toISOString() ?? null,
    })),
    registeredCount: counted?.registered ?? 0,
    capacity: event.capacity,
  };
}
