import type { NotEligibleDetails, Registration } from "../schema";

/**
 * What the register control shows, and what each answer from the API turns it
 * into (P-01, US-2).
 *
 * Pure, and separate from both the screen and the control, because this is the
 * part with rules in it: a full event must become an offer rather than a
 * failure, an ineligible learner must be told which criterion excluded them,
 * and a cancellation must land back on the right control — "Register" for an
 * event still open, "Registration closed" for one that is not. Each of those is
 * a product decision from the PRD, and each is cheap to test here and awkward
 * to test through a rendered component.
 */

export type RegisterState =
  | { kind: "none" }
  | { kind: "registered" }
  | { kind: "waitlisted"; position: number | null }
  | { kind: "closed" }
  | { kind: "full"; waitlistAvailable: boolean }
  | { kind: "ineligible"; details: NotEligibleDetails };

export type ApiError = { code: string; details?: Record<string, unknown> };

export type Outcome =
  | { kind: "registration"; registration: Registration }
  | { kind: "error"; error: ApiError };

/** A `registration.*` message key, its tone, and any value the message needs. */
export type ToastPlan = {
  key: string;
  tone: "success" | "info" | "danger";
  position?: number;
};

export type Transition = { state: RegisterState; toast: ToastPlan | null };

type EventShape = {
  registrationOpen: boolean;
  viewerRegistrationStatus: string | null;
  viewerRegistration: { status: string; waitlistPosition: number | null } | null;
};

export function registerStateForEvent(event: EventShape): RegisterState {
  const status = event.viewerRegistration?.status ?? event.viewerRegistrationStatus;

  if (status === "registered") return { kind: "registered" };
  if (status === "waitlisted") {
    return { kind: "waitlisted", position: event.viewerRegistration?.waitlistPosition ?? null };
  }
  return event.registrationOpen ? { kind: "none" } : { kind: "closed" };
}

export function transitionFor(outcome: Outcome, registrationOpen: boolean): Transition {
  if (outcome.kind === "registration") {
    const { status, waitlistPosition } = outcome.registration;

    if (status === "registered") {
      return { state: { kind: "registered" }, toast: { key: "toast.registered", tone: "success" } };
    }
    if (status === "waitlisted") {
      return {
        state: { kind: "waitlisted", position: waitlistPosition },
        toast:
          waitlistPosition === null
            ? { key: "toast.waitlistedNoPosition", tone: "info" }
            : { key: "toast.waitlisted", tone: "info", position: waitlistPosition },
      };
    }
    // Cancelled. A learner who gave up a place on an event that has since
    // closed must not be offered a register button that would be refused.
    return {
      state: registrationOpen ? { kind: "none" } : { kind: "closed" },
      toast: { key: "toast.cancelled", tone: "info" },
    };
  }

  const { code, details } = outcome.error;

  if (code === "EVENT_FULL") {
    // Absent means available: the waitlist is the norm, and a refusal that
    // arrives without the flag should still offer the thing US-2 promises.
    return {
      state: { kind: "full", waitlistAvailable: details?.waitlistAvailable !== false },
      toast: null,
    };
  }

  if (code === "NOT_ELIGIBLE" && isNotEligibleDetails(details)) {
    return { state: { kind: "ineligible", details }, toast: null };
  }

  // Everything else — a lost connection, an expired session, a 500. The state
  // is unchanged, so the learner can try the same tap again.
  return {
    state: registrationOpen ? { kind: "none" } : { kind: "closed" },
    toast: { key: "toast.failed", tone: "danger" },
  };
}

export function isNotEligibleDetails(value: unknown): value is NotEligibleDetails {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as NotEligibleDetails).criterion === "string";
}
