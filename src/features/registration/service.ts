import "server-only";

import type { Session } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/client";
import { HirayaError, errors } from "@/lib/errors";
import { log } from "@/lib/log";

import { callCancelRegistration, callRegisterForEvent, selectRoster } from "./queries";
import type { RegistrationOutcome } from "./queries";
import {
  eventFullDetailsSchema,
  notEligibleDetailsSchema,
} from "./schema";
import type {
  CancelRegistrationResponse,
  ListRosterQuery,
  ListRosterResponse,
  RegisterEventBody,
  RegisterEventResponse,
  Registration,
} from "./schema";

/**
 * Registration business logic (FR-3.3, US-2).
 *
 * The rules a row policy cannot see — capacity, waitlist order, which criterion
 * excluded a learner — live in `public.register_for_event`, not here
 * (src/db/rls/05_registration.sql). What is left for this file is the job a
 * service is actually for: turning a database outcome into the domain error
 * vocabulary in src/lib/errors.ts, so that the route handler stays thin and
 * nothing below it learns about HTTP.
 *
 * That split is worth stating because it looks like indirection. It is not: the
 * alternative is a service that counts registrations, and a service that counts
 * registrations is a service that overbooks an event the first time two
 * learners tap Register in the same second.
 */

/**
 * The officer roles admitted to a roster. RLS already decides this — the policy
 * restricts the rows to the hosting org's officers and advisers — so this list
 * exists to produce a 403 that names what is missing rather than an empty
 * roster that reads as "nobody registered" (src/lib/auth/session.ts).
 */
export const ROSTER_ROLES = [
  "org_officer",
  "org_adviser",
  "sslg_officer",
  "sslg_adviser",
  "school_admin",
] as const;

function toRegistration(eventId: string, outcome: RegistrationOutcome): Registration {
  if (!outcome.r_status || !outcome.r_registered_at) {
    // Only reachable if the function returned a success outcome with no row,
    // which would mean the SQL and this file disagree about the contract.
    throw errors.internal("register_for_event returned no registration row");
  }
  return {
    eventId,
    status: outcome.r_status,
    waitlistPosition: outcome.r_waitlist_position,
    registeredAt: outcome.r_registered_at.toISOString(),
  };
}

export async function registerForEvent(
  session: Session,
  eventId: string,
  body: RegisterEventBody,
): Promise<RegisterEventResponse> {
  const outcome = await withTenant(session, (tx) =>
    callRegisterForEvent(tx, eventId, body.acceptWaitlist),
  );

  switch (outcome.r_outcome) {
    case "registered":
    case "waitlisted":
      return { registration: toRegistration(eventId, outcome) };

    case "event_full":
      // Parsed, not forwarded: `details` is serialized to the client, so it
      // leaves through the same contract the client reads it with.
      throw new HirayaError(
        "EVENT_FULL",
        "This event is full",
        eventFullDetailsSchema.parse(outcome.r_detail),
      );

    case "not_eligible":
      throw new HirayaError(
        "NOT_ELIGIBLE",
        "You are not eligible for this event",
        notEligibleDetailsSchema.parse(outcome.r_detail),
      );

    default:
      // `cancelled` cannot come back from a register call, and `not_found`
      // covers an event in another school as well as one that does not exist.
      throw errors.notFound("event");
  }
}

export async function cancelRegistration(
  session: Session,
  eventId: string,
): Promise<CancelRegistrationResponse> {
  const outcome = await withTenant(session, (tx) => callCancelRegistration(tx, eventId));

  if (outcome.r_outcome !== "cancelled") {
    // Nothing to cancel is NOT_FOUND rather than a success, so a client that
    // thinks it holds a seat finds out that it does not.
    throw errors.notFound("registration");
  }

  if (outcome.r_promoted_profile_id) {
    // Ids only. A promotion is the one moment a waitlisted learner needs to be
    // told something, and Phase 4 hangs a notification on this line.
    log.info("registration.waitlist_promoted", {
      event_id: eventId,
      profile_id: outcome.r_promoted_profile_id,
    });
  }

  return {
    registration: {
      eventId,
      status: "cancelled",
      waitlistPosition: null,
      registeredAt: (outcome.r_registered_at ?? new Date()).toISOString(),
    },
  };
}

export async function listRoster(
  session: Session,
  eventId: string,
  query: ListRosterQuery,
): Promise<ListRosterResponse> {
  const roster = await withTenant(session, (tx) => selectRoster(tx, eventId, query));
  if (!roster) throw errors.notFound("event");

  return {
    eventId,
    entries: roster.entries,
    registeredCount: roster.registeredCount,
    capacity: roster.capacity,
  };
}
