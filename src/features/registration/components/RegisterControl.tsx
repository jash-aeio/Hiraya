"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge, Button, Dialog } from "@/design";

import type { IneligibilityCriterion, NotEligibleDetails } from "../schema";
import type { RegisterState } from "./registerState";

/**
 * The register control (P-01, FR-3.3, US-2).
 *
 * Presentational and controlled: it owns the cancel confirmation and nothing
 * else. The screen above it owns the transport, which is what lets the same
 * control render against a fixture today and against `POST /events/:id/register`
 * the day D-01 merges, with no second code path to keep in step.
 *
 * Learner register (D12) — but restrained. This is the moment a learner commits
 * to being somewhere on a Saturday, and a control that celebrates before the
 * check-in has happened would be celebrating the wrong thing. The celebration
 * belongs at the gate, where a teacher confirmed it.
 *
 * Two states are refusals, and both say *why* rather than greying out:
 *
 *   `full` — the event is full and offers the waitlist in the same breath, so
 *   the learner chooses it rather than discovering afterwards that they hold a
 *   waitlist place (US-2).
 *   `ineligible` — names the one criterion that excluded them. "Ineligible
 *   learners see why, not a generic failure" is an acceptance criterion, not a
 *   nicety: a learner who cannot tell whether they were excluded or the app
 *   broke asks an adviser, and that is the paperwork this platform exists to
 *   remove.
 */

export type RegisterControlProps = {
  state: RegisterState;
  busy?: boolean;
  onRegister: () => void;
  onJoinWaitlist: () => void;
  onCancel: () => void;
};

export function RegisterControl({
  state,
  busy = false,
  onRegister,
  onJoinWaitlist,
  onCancel,
}: RegisterControlProps) {
  const t = useTranslations("registration");
  const [confirming, setConfirming] = useState(false);

  const leaving = state.kind === "waitlisted";

  return (
    <div className="flex flex-col gap-3">
      {state.kind === "none" ? (
        <Button fullWidth loading={busy} onClick={onRegister}>
          {t("register")}
        </Button>
      ) : null}

      {state.kind === "closed" ? (
        <>
          <Button fullWidth disabled>
            {t("closed")}
          </Button>
          <p className="type-small text-ink-muted">{t("closedHint")}</p>
        </>
      ) : null}

      {state.kind === "full" ? (
        <div className="flex flex-col gap-3 rounded-lg bg-surface-sunk p-4">
          <div className="flex flex-col gap-1">
            <p className="type-body-strong text-ink">{t("full.title")}</p>
            <p className="type-small text-ink-muted">
              {state.waitlistAvailable ? t("full.description") : t("full.unavailable")}
            </p>
          </div>
          {state.waitlistAvailable ? (
            <Button fullWidth loading={busy} onClick={onJoinWaitlist}>
              {t("full.join")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {state.kind === "ineligible" ? (
        <div className="flex flex-col gap-1 rounded-lg bg-surface-sunk p-4">
          <p className="type-body-strong text-ink">{t("ineligible.title")}</p>
          <IneligibilityReason details={state.details} />
        </div>
      ) : null}

      {state.kind === "registered" || state.kind === "waitlisted" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {state.kind === "registered" ? (
            <Badge tone="success">{t("registered")}</Badge>
          ) : (
            <Badge tone="pending">
              {state.position === null
                ? t("waitlistedNoPosition")
                : t("waitlisted", { position: state.position })}
            </Badge>
          )}
          <Button variant="ghost" loading={busy} onClick={() => setConfirming(true)}>
            {leaving ? t("leaveWaitlist") : t("cancel")}
          </Button>
        </div>
      ) : null}

      {/* A seat given up may be promoted to someone else within seconds, so this
          is not an undo. The confirmation is the one place in the learner flow
          that asks twice. */}
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={leaving ? t("confirm.leaveTitle") : t("confirm.cancelTitle")}
        description={leaving ? t("confirm.leaveBody") : t("confirm.cancelBody")}
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setConfirming(false)}>
              {t("confirm.keep")}
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={busy}
              onClick={() => {
                setConfirming(false);
                onCancel();
              }}
            >
              {leaving ? t("confirm.leave") : t("confirm.cancel")}
            </Button>
          </>
        }
      />
    </div>
  );
}

/**
 * One criterion, in the learner's own words. The server sends the criterion and
 * the event's own published rule beside it; the sentence is assembled here so
 * the API never has to hold a translated string.
 */
function IneligibilityReason({ details }: { details: NotEligibleDetails }) {
  const t = useTranslations("registration");
  const format = useFormatter();
  const criterion: IneligibilityCriterion = details.criterion;

  if (criterion === "grade_level" && details.allowedGradeLevels?.length) {
    const grades = format.list(
      details.allowedGradeLevels.map((grade) => t("grade", { grade })),
      { type: "conjunction" },
    );
    return <p className="type-small text-ink-muted">{t("ineligible.grade_level", { grades })}</p>;
  }

  if (criterion === "section" && details.allowedSections?.length) {
    const sections = format.list(details.allowedSections, { type: "conjunction" });
    return <p className="type-small text-ink-muted">{t("ineligible.section", { sections })}</p>;
  }

  // A criterion whose rule did not come with it — the server may withhold the
  // detail, and a message with an unfilled {grades} placeholder throws at
  // render. The generic sentence still says it was a rule and not a fault.
  const key =
    criterion === "grade_level" || criterion === "section"
      ? "ineligible.generic"
      : `ineligible.${criterion}`;

  return <p className="type-small text-ink-muted">{t(key)}</p>;
}
