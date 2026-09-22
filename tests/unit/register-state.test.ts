import { describe, expect, it } from "vitest";

import {
  registerStateForEvent,
  transitionFor,
} from "@/features/registration/components/registerState";
import type { Outcome } from "@/features/registration/components/registerState";
import type { RegistrationStatus } from "@/features/registration/schema";

/**
 * The register control's rules (P-01, US-2).
 *
 * Each case here is a product decision from the PRD rather than a rendering
 * detail — which refusal becomes an offer, which becomes an explanation, and
 * where a cancellation lands. They are tested against the pure mapping because
 * a state machine verified only by clicking through a screen is a state machine
 * whose rarest branch is never verified at all.
 */

const EVENT_ID = "00000000-0000-4000-8000-000000000001";

const registration = (
  status: RegistrationStatus,
  waitlistPosition: number | null = null,
): Outcome => ({
  kind: "registration",
  registration: { eventId: EVENT_ID, status, waitlistPosition, registeredAt: "2026-09-22T01:00:00Z" },
});

describe("registerStateForEvent", () => {
  it("offers registration on an open event the learner has not joined", () => {
    expect(
      registerStateForEvent({
        registrationOpen: true,
        viewerRegistrationStatus: null,
        viewerRegistration: null,
      }),
    ).toEqual({ kind: "none" });
  });

  it("shows a closed control rather than a button that would be refused", () => {
    expect(
      registerStateForEvent({
        registrationOpen: false,
        viewerRegistrationStatus: null,
        viewerRegistration: null,
      }),
    ).toEqual({ kind: "closed" });
  });

  it("carries the learner's own waitlist position through", () => {
    expect(
      registerStateForEvent({
        registrationOpen: true,
        viewerRegistrationStatus: "waitlisted",
        viewerRegistration: { status: "waitlisted", waitlistPosition: 3 },
      }),
    ).toEqual({ kind: "waitlisted", position: 3 });
  });

  it("still renders the waitlist when the position is unknown", () => {
    // The list endpoint carries only a status string; the detail endpoint
    // carries the position. A screen reached from the list must not crash on
    // the half it has.
    expect(
      registerStateForEvent({
        registrationOpen: true,
        viewerRegistrationStatus: "waitlisted",
        viewerRegistration: null,
      }),
    ).toEqual({ kind: "waitlisted", position: null });
  });

  it("treats a cancelled registration as not registered", () => {
    expect(
      registerStateForEvent({
        registrationOpen: true,
        viewerRegistrationStatus: "cancelled",
        viewerRegistration: { status: "cancelled", waitlistPosition: null },
      }),
    ).toEqual({ kind: "none" });
  });
});

describe("transitionFor", () => {
  it("turns a full event into the waitlist offer, not a failure (US-2)", () => {
    const { state, toast } = transitionFor(
      { kind: "error", error: { code: "EVENT_FULL", details: { capacity: 40, waitlistAvailable: true } } },
      true,
    );
    expect(state).toEqual({ kind: "full", waitlistAvailable: true });
    // No toast: the offer is on the control, where the next tap is.
    expect(toast).toBeNull();
  });

  it("still offers the waitlist when the refusal did not say whether one exists", () => {
    const { state } = transitionFor({ kind: "error", error: { code: "EVENT_FULL" } }, true);
    expect(state).toEqual({ kind: "full", waitlistAvailable: true });
  });

  it("withholds the offer when the waitlist is closed too", () => {
    const { state } = transitionFor(
      { kind: "error", error: { code: "EVENT_FULL", details: { waitlistAvailable: false } } },
      true,
    );
    expect(state).toEqual({ kind: "full", waitlistAvailable: false });
  });

  it("keeps the criterion that excluded the learner", () => {
    const { state } = transitionFor(
      {
        kind: "error",
        error: { code: "NOT_ELIGIBLE", details: { criterion: "grade_level", allowedGradeLevels: [11, 12] } },
      },
      true,
    );
    expect(state).toEqual({
      kind: "ineligible",
      details: { criterion: "grade_level", allowedGradeLevels: [11, 12] },
    });
  });

  it("falls back to a failure toast when NOT_ELIGIBLE arrives without a criterion", () => {
    const { toast } = transitionFor({ kind: "error", error: { code: "NOT_ELIGIBLE" } }, true);
    expect(toast).toEqual({ key: "toast.failed", tone: "danger" });
  });

  it("reports a registration with the tone of a success", () => {
    expect(transitionFor(registration("registered"), true)).toEqual({
      state: { kind: "registered" },
      toast: { key: "toast.registered", tone: "success" },
    });
  });

  it("names the waitlist position in the confirmation", () => {
    expect(transitionFor(registration("waitlisted", 4), true)).toEqual({
      state: { kind: "waitlisted", position: 4 },
      toast: { key: "toast.waitlisted", tone: "info", position: 4 },
    });
  });

  it("uses the position-free message when the server did not send one", () => {
    const { toast } = transitionFor(registration("waitlisted", null), true);
    expect(toast).toEqual({ key: "toast.waitlistedNoPosition", tone: "info" });
  });

  it("returns a cancelling learner to a register button while the event is open", () => {
    const { state } = transitionFor(registration("cancelled"), true);
    expect(state).toEqual({ kind: "none" });
  });

  it("does not offer to re-register on an event that has closed", () => {
    const { state } = transitionFor(registration("cancelled"), false);
    expect(state).toEqual({ kind: "closed" });
  });

  it("leaves a learner able to retry after a network failure", () => {
    const { state, toast } = transitionFor({ kind: "error", error: { code: "INTERNAL" } }, true);
    expect(state).toEqual({ kind: "none" });
    expect(toast).toEqual({ key: "toast.failed", tone: "danger" });
  });
});
