"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Card, Chip, EmptyState, Skeleton, useToast } from "@/design";
import type { OrgCategory } from "@/design";
import { RegisterControl } from "@/features/registration/components/RegisterControl";
import { registerStateForEvent, transitionFor } from "@/features/registration/components/registerState";
import type {
  ApiError,
  Outcome,
  RegisterState,
} from "@/features/registration/components/registerState";
import type { Registration } from "@/features/registration/schema";

import type { EventDetail } from "../schema";

/**
 * The event detail screen (P-01) — one event, and the register control.
 *
 * A client component talking to /api/v1 rather than a Server Component reading
 * the service, for the reason EventList is one: the Capacitor shell ships a
 * static bundle and runs no server (CLAUDE.md R3). A screen that only works
 * when Next renders it is a screen the native app does not have.
 *
 * `fetch` and shallow type guards rather than TanStack Query and Zod, also
 * following EventList — importing the shared Zod schema into a client component
 * put the whole of Zod in the bundle and cost 111 KB of first load there. R7 is
 * satisfied where it asks to be: the handler parses every request, and the types
 * below are inferred from the same schema file at compile time, where they weigh
 * nothing.
 *
 * It owns the transport for the register control beneath it, so that control
 * stays presentational, and so registering, joining a waitlist and cancelling
 * share one error-mapping path instead of three.
 */

const CATEGORY_TOKEN: Record<string, OrgCategory> = {
  academic: "academic",
  arts: "arts",
  sports: "sports",
  service: "service",
  faith_based: "faith",
  special_interest: "interest",
};

type Status = "loading" | "ready" | "missing" | "failed";

function isEventDetail(value: unknown): value is EventDetail {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<EventDetail>;
  return (
    typeof event.id === "string" &&
    typeof event.title === "string" &&
    typeof event.org === "object" &&
    event.org !== null &&
    typeof event.registrationOpen === "boolean"
  );
}

function isRegistration(value: unknown): value is Registration {
  if (typeof value !== "object" || value === null) return false;
  const registration = value as Partial<Registration>;
  return typeof registration.status === "string" && typeof registration.eventId === "string";
}

/** `{ error: { code, details } }` — the one failure envelope every handler returns. */
async function readError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json();
    const error = (body as { error?: unknown }).error;
    if (
      typeof error === "object" &&
      error !== null &&
      typeof (error as ApiError).code === "string"
    ) {
      return error as ApiError;
    }
  } catch {
    // A failure that is not even JSON is a network or proxy failure. The
    // generic branch says so without inventing detail.
  }
  return { code: "INTERNAL" };
}

export function EventDetailScreen({ eventId }: { eventId: string }) {
  const t = useTranslations("events");
  const tr = useTranslations("registration");
  const format = useFormatter();
  const toast = useToast();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [registerState, setRegisterState] = useState<RegisterState>({ kind: "none" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await fetch(`/api/v1/events/${eventId}`, {
          headers: { accept: "application/json" },
        });
        if (response.status === 404) throw new Error("missing");
        if (!response.ok) throw new Error(String(response.status));

        const body: unknown = await response.json();
        const detail = (body as { event?: unknown }).event;
        if (!isEventDetail(detail)) throw new Error("shape");

        if (cancelled) return;
        setEvent(detail);
        setRegisterState(registerStateForEvent(detail));
        setStatus("ready");
      } catch (error: unknown) {
        // No detail is surfaced or logged: the causes are a network error, an
        // expired session, or an event in another school — and none of them is
        // improved by an error string on a learner's screen (CLAUDE.md R8).
        if (cancelled) return;
        setStatus(error instanceof Error && error.message === "missing" ? "missing" : "failed");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  /**
   * The refusals are the product here — `EVENT_FULL` becomes the waitlist offer
   * and `NOT_ELIGIBLE` becomes the reason — so they are mapped into state
   * rather than flattened into a toast the learner has to interpret. The rules
   * live in `registerState.ts`; this only renders their result.
   */
  const applyOutcome = useCallback(
    (outcome: Outcome, registrationOpen: boolean): void => {
      const { state, toast: plan } = transitionFor(outcome, registrationOpen);
      setRegisterState(state);
      if (!plan) return;
      toast({
        message: plan.position === undefined ? tr(plan.key) : tr(plan.key, { position: plan.position }),
        tone: plan.tone,
      });
    },
    [toast, tr],
  );

  const submit = useCallback(
    async (action: "register" | "waitlist" | "cancel"): Promise<void> => {
      const openAfterCancel = event?.registrationOpen ?? true;
      setBusy(true);

      try {
        const response = await fetch(`/api/v1/events/${eventId}/register`, {
          method: action === "cancel" ? "DELETE" : "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body:
            action === "cancel"
              ? undefined
              : JSON.stringify({ acceptWaitlist: action === "waitlist" }),
        });

        if (!response.ok) {
          applyOutcome({ kind: "error", error: await readError(response) }, openAfterCancel);
          return;
        }

        const body: unknown = await response.json();
        const registration = (body as { registration?: unknown }).registration;
        applyOutcome(
          isRegistration(registration)
            ? { kind: "registration", registration }
            : { kind: "error", error: { code: "INTERNAL" } },
          openAfterCancel,
        );
      } catch {
        applyOutcome({ kind: "error", error: { code: "INTERNAL" } }, openAfterCancel);
      } finally {
        setBusy(false);
      }
    },
    [applyOutcome, event, eventId],
  );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/events"
        className="type-small -ml-1 inline-flex min-h-11 w-fit items-center gap-1.5 px-1 text-primary-ink hover:text-primary-hover"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("detail.back")}
      </Link>

      {status === "loading" ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-40" label={t("detail.loading")} />
          <Skeleton variant="block" className="h-28" />
        </div>
      ) : null}

      {status === "missing" ? (
        <EmptyState
          title={t("detail.missing.title")}
          description={t("detail.missing.description")}
          art={
            /* Static art from `public/`, fetched lazily, so it costs the JS
               budget nothing (ASSET_CHECKLIST.md). next/image would add a
               loader and a request layer to a few hundred bytes of vector. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/empty/no-events.svg" width={140} height={112} alt="" loading="lazy" />
          }
        />
      ) : null}

      {status === "failed" ? (
        <EmptyState title={t("failed.title")} description={t("failed.description")} />
      ) : null}

      {status === "ready" && event ? (
        <>
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Chip category={CATEGORY_TOKEN[event.org.category]}>
                  {t(`category.${event.org.category}`)}
                </Chip>
                <span className="type-small text-ink-muted">{event.org.name}</span>
              </div>

              <div className="flex flex-col gap-1">
                <h1 className="type-h1 text-ink">{event.title}</h1>
                {/* `dateTime` carries the machine-readable value; the visible
                    text is localized, so a screen reader and a learner get the
                    same moment. */}
                <time className="type-body text-ink-muted" dateTime={event.startsAt}>
                  {format.dateTime(new Date(event.startsAt), {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
                {event.venue ? <p className="type-body text-ink-muted">{event.venue}</p> : null}
              </div>

              {event.capacity === null ? null : (
                <p className="type-small text-ink-muted">
                  {t("capacity", { count: event.capacity })}
                </p>
              )}

              <RegisterControl
                state={registerState}
                busy={busy}
                onRegister={() => void submit("register")}
                onJoinWaitlist={() => void submit("waitlist")}
                onCancel={() => void submit("cancel")}
              />
            </div>
          </Card>

          {event.description ? (
            <section className="flex flex-col gap-2">
              <h2 className="type-h3 text-ink">{t("detail.about")}</h2>
              <p className="type-body whitespace-pre-line text-ink-muted">{event.description}</p>
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <h2 className="type-h3 text-ink">{t("detail.who")}</h2>
            <EligibilityNote event={event} />
            {/* The check-in that the whole loop turns on, named on the screen
                where a learner decides to come. A point means a teacher
                confirmed you were there, and the place to say so is before the
                event, not after it. */}
            <p className="type-small text-ink-muted">{t("detail.checkinNote")}</p>
          </section>
        </>
      ) : null}
    </div>
  );
}

/**
 * The event's own rule, shown before a learner taps rather than only after they
 * are refused. The refusal still names its criterion — this spares the round
 * trip, it does not replace it.
 */
function EligibilityNote({ event }: { event: EventDetail }) {
  const t = useTranslations("events");
  const tr = useTranslations("registration");
  const format = useFormatter();
  const { gradeLevels, sections, orgIds } = event.eligibility;

  if (gradeLevels.length > 0) {
    const grades = format.list(
      gradeLevels.map((grade) => tr("grade", { grade })),
      { type: "conjunction" },
    );
    return <p className="type-body text-ink-muted">{t("detail.openToGrades", { grades })}</p>;
  }

  if (sections.length > 0) {
    return (
      <p className="type-body text-ink-muted">
        {t("detail.openToSections", { sections: format.list(sections, { type: "conjunction" }) })}
      </p>
    );
  }

  if (orgIds.length > 0) {
    return <p className="type-body text-ink-muted">{t("detail.openToMembers")}</p>;
  }

  return <p className="type-body text-ink-muted">{t("detail.openToAll")}</p>;
}
