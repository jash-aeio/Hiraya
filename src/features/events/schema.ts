import { z } from "zod";

import { orgCategory } from "@/db/enums";

/**
 * The /api/v1/events contracts (CLAUDE.md R7).
 *
 * Phase 0 ships the read half only: browse is the first screen of the walkable
 * loop, while proposal, approval and registration are Phase 2. The write
 * schemas land with that phase rather than being sketched here — an unused
 * request schema is a contract nobody has tested.
 *
 * Note what an event summary does not carry: no registrant names, no registrant
 * count. A learner's own policy on `event_registrations` shows them their own
 * row and nothing else (src/db/rls/event_registrations.sql), so a fill count
 * below officer would have to come from somewhere that outranks the policy.
 * Capacity is published; how full it is, is not — see `capacity` below.
 */

export const eventScopeSchema = z.enum(["upcoming", "past"]);

export type EventScope = z.infer<typeof eventScopeSchema>;

/**
 * Query parameters arrive as strings from `URLSearchParams`, so every field
 * here has to survive that: no `z.number()` without a coercion, no `z.boolean()`
 * at all.
 */
export const listEventsQuerySchema = z.object({
  scope: eventScopeSchema.default("upcoming"),
  /** Org category, matching the six Discover Orgs filters (FR-2.5). */
  category: z.enum(orgCategory.enumValues).optional(),
  orgId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

export const eventSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  venue: z.string().nullable(),
  /**
   * The published ceiling, or null for an uncapped event. It is deliberately
   * not accompanied by a "spots left": that number is not readable by a learner
   * under the registrations policy, and the ways to produce it anyway — a
   * SECURITY DEFINER counter, or a denormalized column — are Phase 2 decisions
   * with their own trade-offs, not something to slip in behind a card label.
   */
  capacity: z.number().int().nullable(),
  status: z.string(),
  org: z.object({
    id: z.uuid(),
    name: z.string(),
    category: z.enum(orgCategory.enumValues),
    logoKey: z.string().nullable(),
  }),
  /**
   * The caller's own registration, or null. Readable because it is their row —
   * the same policy that hides everyone else's.
   */
  viewerRegistrationStatus: z.string().nullable(),
});

export type EventSummary = z.infer<typeof eventSummarySchema>;

export const listEventsResponseSchema = z.object({
  events: z.array(eventSummarySchema),
});

export type ListEventsResponse = z.infer<typeof listEventsResponseSchema>;
