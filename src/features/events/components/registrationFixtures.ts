import type { Outcome } from "@/features/registration/components/registerState";

/**
 * What `POST`/`DELETE /events/:id/register` would have answered, for the
 * fixture path only (src/lib/fixtures.ts). **Deleted with D-01.**
 *
 * It lives beside the event fixtures rather than under `features/registration/`
 * because the two are one story: the `?preview=` variant chooses both the event
 * and the answer its register control gets, and splitting them across two
 * folders would mean keeping two lists of variant names in step for the few
 * days this path exists.
 *
 * The refusals it can produce are the point. `full` and `ineligible` are states
 * a seeded database cannot be asked for on demand — they depend on who is
 * asking and on how full the event already is — so without them the two
 * hardest states of P-01 would first be seen in production.
 */

const EVENT_ID = "22222222-2222-4222-8222-222222222222";

export function fixtureOutcome(
  action: "register" | "waitlist" | "cancel",
  preview: string | null,
): Outcome {
  if (action === "cancel") {
    return {
      kind: "registration",
      registration: {
        eventId: EVENT_ID,
        status: "cancelled",
        waitlistPosition: null,
        registeredAt: new Date().toISOString(),
      },
    };
  }

  if (preview === "ineligible") {
    return {
      kind: "error",
      error: { code: "NOT_ELIGIBLE", details: { criterion: "grade_level", allowedGradeLevels: [11, 12] } },
    };
  }

  // A full event refuses the first attempt and offers the waitlist; the second
  // attempt carries `acceptWaitlist` and is accepted (US-2).
  if (preview === "full" && action === "register") {
    return {
      kind: "error",
      error: { code: "EVENT_FULL", details: { capacity: 40, waitlistAvailable: true } },
    };
  }

  return {
    kind: "registration",
    registration: {
      eventId: EVENT_ID,
      status: action === "waitlist" ? "waitlisted" : "registered",
      waitlistPosition: action === "waitlist" ? 4 : null,
      registeredAt: new Date().toISOString(),
    },
  };
}
