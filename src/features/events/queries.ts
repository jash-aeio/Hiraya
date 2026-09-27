import "server-only";

import { and, asc, desc, eq, gte, lt } from "drizzle-orm";

import { eventRegistrations, events, organizations } from "@/db/schema";
import type { TenantTransaction } from "@/lib/db/client";

import { eventEligibilitySchema } from "./schema";
import type { EventDetail, EventSummary, ListEventsQuery } from "./schema";

/**
 * Reads for the events feature.
 *
 * Every query here runs inside `withTenant`, so the tenancy filter and the
 * rule "an event is invisible to learners until it is approved" are already in
 * force from `src/db/rls/events.sql`. Nothing below re-states either, and that
 * is deliberate: a query that filtered on `status` *in order to hide rows* would
 * look safe while quietly becoming the thing the policy is trusted to be. If
 * this query is ever wrong about what a learner may see, the policy is where to
 * fix it.
 *
 * `query.status` (added with J-12) is not that. It narrows a result set the
 * caller has already been granted -- a staff surface asking for the approval
 * queue instead of the browse list -- and it can only ever return fewer rows
 * than the policy allows. The distinction is the whole point: a filter that
 * subtracts from what a policy permits is a feature, and a filter that is relied
 * on to subtract is a security bug waiting for the day someone drops it.
 *
 * The join to `event_registrations` is scoped to the caller's own profile. It
 * would be scoped that way by the policy regardless (a learner sees only their
 * own row), but writing it explicitly keeps the LEFT JOIN from silently
 * becoming a one-to-many for an officer, who can see the whole roster.
 */

export async function selectEvents(
  tx: TenantTransaction,
  viewerProfileId: string,
  query: ListEventsQuery,
): Promise<EventSummary[]> {
  const now = new Date();

  const conditions = [
    query.scope === "upcoming" ? gte(events.endsAt, now) : lt(events.endsAt, now),
    query.category ? eq(organizations.category, query.category) : undefined,
    query.orgId ? eq(events.orgId, query.orgId) : undefined,
    // Narrows within what the policy already allows; see the note on `status` in
    // ./schema.ts. This is the one status condition in the feature, and it exists
    // because the caller asked for it -- not because a screen needs protecting.
    query.status ? eq(events.status, query.status) : undefined,
  ].filter((c) => c !== undefined);

  const rows = await tx
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      venue: events.venue,
      capacity: events.capacity,
      status: events.status,
      orgId: organizations.id,
      orgName: organizations.name,
      orgCategory: organizations.category,
      orgLogoKey: organizations.logoKey,
      viewerRegistrationStatus: eventRegistrations.status,
    })
    .from(events)
    .innerJoin(organizations, eq(organizations.id, events.orgId))
    .leftJoin(
      eventRegistrations,
      and(
        eq(eventRegistrations.eventId, events.id),
        eq(eventRegistrations.profileId, viewerProfileId),
      ),
    )
    .where(and(...conditions))
    // Upcoming reads forwards from today; past reads backwards from today. Both
    // put the event a learner is most likely to be looking for first.
    .orderBy(query.scope === "upcoming" ? asc(events.startsAt) : desc(events.startsAt))
    .limit(query.limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    venue: row.venue,
    capacity: row.capacity,
    status: row.status,
    org: {
      id: row.orgId,
      name: row.orgName,
      category: row.orgCategory,
      logoKey: row.orgLogoKey,
    },
    viewerRegistrationStatus: row.viewerRegistrationStatus,
  }));
}

/**
 * One event, with the caller's own registration and the event's published
 * eligibility rule (D-01, P-01).
 *
 * A detail read exists rather than being a filtered view of the list because a
 * screen that can be deep-linked, shared (FR-6.3) or opened from a notification
 * cannot depend on a collection the client happens to hold
 * (features/events/schema.ts).
 *
 * `eligibility_json` is a jsonb column with no shape guarantee at the database
 * level, so it is parsed rather than cast — an event seeded with a stray key
 * should not reach a component as an undefined array.
 */
export async function selectEventDetail(
  tx: TenantTransaction,
  viewerProfileId: string,
  eventId: string,
): Promise<EventDetail | null> {
  const [row] = await tx
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      venue: events.venue,
      capacity: events.capacity,
      status: events.status,
      eligibilityJson: events.eligibilityJson,
      orgId: organizations.id,
      orgName: organizations.name,
      orgCategory: organizations.category,
      orgLogoKey: organizations.logoKey,
      registrationStatus: eventRegistrations.status,
      registrationWaitlistPosition: eventRegistrations.waitlistPosition,
      registrationRegisteredAt: eventRegistrations.registeredAt,
    })
    .from(events)
    .innerJoin(organizations, eq(organizations.id, events.orgId))
    .leftJoin(
      eventRegistrations,
      and(
        eq(eventRegistrations.eventId, events.id),
        eq(eventRegistrations.profileId, viewerProfileId),
      ),
    )
    .where(eq(events.id, eventId))
    .limit(1);

  // No row means the events policy did not admit this caller to it, which is
  // the same answer as "no such event" on purpose (src/lib/errors.ts).
  if (!row) return null;

  const eligibility = eventEligibilitySchema.parse(row.eligibilityJson ?? {});

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    venue: row.venue,
    capacity: row.capacity,
    status: row.status,
    org: {
      id: row.orgId,
      name: row.orgName,
      category: row.orgCategory,
      logoKey: row.orgLogoKey,
    },
    viewerRegistrationStatus: row.registrationStatus,
    eligibility,
    // The same two conditions register_for_event checks before it counts
    // anything. They are duplicated knowingly: here the answer renders a
    // disabled control, there it refuses a write, and only the second one is
    // load-bearing. If they ever disagree, the function is right.
    registrationOpen: row.status === "approved" && row.endsAt > new Date(),
    viewerRegistration:
      row.registrationStatus && row.registrationRegisteredAt
        ? {
            status: row.registrationStatus,
            waitlistPosition: row.registrationWaitlistPosition,
            registeredAt: row.registrationRegisteredAt.toISOString(),
          }
        : null,
  };
}
