import { z } from "zod";

import { registrationStatus } from "@/db/enums";

/**
 * The registration contracts — `POST /events/:id/register`,
 * `DELETE /events/:id/register`, and the host's roster read
 * (CLAUDE.md R7, docs/SYSTEM_DESIGN.md §5, FR-3.3, US-2).
 *
 * This is J-01, the first two-lane handshake (docs/WORKSTREAMS.md §2): it
 * merges before either lane starts so Lane D builds downward from it and Lane P
 * builds upward against fixtures typed off the same `z.infer`.
 *
 * Phase 0 ships the demo subset of FR-3.3 — register, waitlist, cancel, and the
 * ineligibility *reason*. Reminders (FR-3.3) and the officer-side roster
 * management that Phase 2 adds are not shaped here: an unused request schema is
 * a contract nobody has tested.
 */

export const registrationStatusSchema = z.enum(registrationStatus.enumValues);

export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;

/**
 * Registering a full event is a *refusal with an offer*, not a silent
 * downgrade (US-2). The first call carries `acceptWaitlist: false` and is
 * refused with `EVENT_FULL`; the learner chooses the waitlist and the second
 * call carries `true`. A learner should never discover that they hold a
 * waitlist place rather than a seat by reading a badge afterwards.
 */
export const registerEventBodySchema = z.object({
  acceptWaitlist: z.boolean().default(false),
});

export type RegisterEventBody = z.infer<typeof registerEventBodySchema>;

export const registrationSchema = z.object({
  eventId: z.uuid(),
  status: registrationStatusSchema,
  /**
   * 1-based, and null for anything but `waitlisted`. It is the learner's own
   * position and nobody else's — the number is readable here because the row is
   * theirs (src/db/rls/event_registrations.sql).
   */
  waitlistPosition: z.number().int().positive().nullable(),
  registeredAt: z.iso.datetime(),
});

export type Registration = z.infer<typeof registrationSchema>;

export const registerEventResponseSchema = z.object({
  registration: registrationSchema,
});

export type RegisterEventResponse = z.infer<typeof registerEventResponseSchema>;

/**
 * Cancelling returns the cancelled row rather than 204, so a client that
 * cancelled a *waitlisted* place and one that gave up a seat can say different
 * things without a second request.
 */
export const cancelRegistrationResponseSchema = z.object({
  registration: registrationSchema,
});

export type CancelRegistrationResponse = z.infer<typeof cancelRegistrationResponseSchema>;

// ---------------------------------------------------------------------------
// Refusals with a shape
// ---------------------------------------------------------------------------

/**
 * The `details` payload of `EVENT_FULL` (src/lib/errors.ts → 409).
 *
 * `waitlistAvailable` is false when the event is over, cancelled, or closed to
 * new registrations — cases where the offer would be a lie.
 */
export const eventFullDetailsSchema = z.object({
  capacity: z.number().int().positive(),
  waitlistAvailable: z.boolean(),
});

export type EventFullDetails = z.infer<typeof eventFullDetailsSchema>;

/**
 * Which criterion excluded a learner (`NOT_ELIGIBLE` → 403).
 *
 * The PRD requires telling a learner *why*, not a generic failure (US-2), and
 * the criteria are the three keys of `events.eligibility_json` plus the two
 * timing refusals. One criterion is returned, not all of them: the first one
 * that failed is the one worth fixing, and enumerating the rest invites a
 * learner to reverse-engineer a roster.
 *
 * Note what this carries and does not: the event's own published rule
 * ("Grades 9–10", "7-Sampaguita"), never the caller's grade or section read
 * back to them. It is a fact about the event, so it is not the section-PII that
 * CLAUDE.md R8 keeps out of responses and logs.
 */
export const ineligibilityCriterionSchema = z.enum([
  "grade_level",
  "section",
  "org_membership",
  "registration_closed",
  "event_not_open",
]);

export type IneligibilityCriterion = z.infer<typeof ineligibilityCriterionSchema>;

export const notEligibleDetailsSchema = z.object({
  criterion: ineligibilityCriterionSchema,
  allowedGradeLevels: z.array(z.number().int()).optional(),
  allowedSections: z.array(z.string()).optional(),
  /** The org whose membership the event is restricted to. */
  orgId: z.uuid().optional(),
});

export type NotEligibleDetails = z.infer<typeof notEligibleDetailsSchema>;

// ---------------------------------------------------------------------------
// Roster — officers and advisers of the hosting org only
// ---------------------------------------------------------------------------

/**
 * `GET /events/:id/roster`. The policy already restricts this to the hosting
 * org's officers and advisers and to School Admin; the handler's role check is
 * the good error message rather than the guarantee (src/lib/auth/session.ts).
 *
 * It carries a display name because an officer at the gate has to find a person
 * in a list, and an avatar because a name alone is slow to scan. It carries no
 * LRN, no email and no contact detail of any kind — those are not on `profiles`
 * at all (CLAUDE.md §6).
 */
export const rosterEntrySchema = z.object({
  profileId: z.uuid(),
  displayName: z.string(),
  avatarKey: z.string().nullable(),
  gradeLevel: z.number().int().nullable(),
  section: z.string().nullable(),
  status: registrationStatusSchema,
  waitlistPosition: z.number().int().positive().nullable(),
  /** Set once this learner has been checked in — the scanner reads it to grey a row out. */
  checkedInAt: z.iso.datetime().nullable(),
});

export type RosterEntry = z.infer<typeof rosterEntrySchema>;

export const listRosterQuerySchema = z.object({
  status: registrationStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type ListRosterQuery = z.infer<typeof listRosterQuerySchema>;

export const listRosterResponseSchema = z.object({
  eventId: z.uuid(),
  entries: z.array(rosterEntrySchema),
  /** Registered (not waitlisted, not cancelled) against the published ceiling. */
  registeredCount: z.number().int().nonnegative(),
  capacity: z.number().int().positive().nullable(),
});

export type ListRosterResponse = z.infer<typeof listRosterResponseSchema>;
