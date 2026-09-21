import "server-only";

import { withTenant } from "@/lib/db/client";
import type { Session } from "@/lib/auth/session";

import { selectEvents } from "./queries";
import type { ListEventsQuery, ListEventsResponse } from "./schema";

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
