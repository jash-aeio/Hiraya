import "server-only";

import { withTenant } from "@/lib/db/client";
import type { Session } from "@/lib/auth/session";

import { errors } from "@/lib/errors";

import { selectEventDetail, selectEvents } from "./queries";
import type { GetEventResponse, ListEventsQuery, ListEventsResponse } from "./schema";

/**
 * Events business logic. Knows nothing about HTTP (CLAUDE.md §4).
 *
 * Phase 0 is the read half of this feature. `listEvents` is thin, and honestly
 * so: the authorization it would otherwise perform is already a database
 * invariant, and duplicating it here would create a second place to be wrong.
 * The service earns its keep in Phase 2, where submit, approve and register
 * carry rules a row policy cannot see — an adviser not approving their own
 * draft, capacity and waitlist ordering, which eligibility criterion excluded
 * a learner.
 */

export async function listEvents(
  session: Session,
  query: ListEventsQuery,
): Promise<ListEventsResponse> {
  const events = await withTenant(session, (tx) => selectEvents(tx, session.profileId, query));
  return { events };
}

/**
 * One event, for the screen that carries the register control (P-01, D-01).
 *
 * An event this caller may not see and an event that does not exist answer the
 * same way, which is the rule src/lib/errors.ts sets for every cross-tenant
 * read: distinguishing them would confirm the row exists somewhere.
 */
export async function getEvent(session: Session, eventId: string): Promise<GetEventResponse> {
  const event = await withTenant(session, (tx) =>
    selectEventDetail(tx, session.profileId, eventId),
  );
  if (!event) throw errors.notFound("event");
  return { event };
}
