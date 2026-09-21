"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge, Button, Card, Chip, EmptyState, Skeleton } from "@/design";
import type { OrgCategory } from "@/design";

import type { EventScope, EventSummary, ListEventsResponse } from "../schema";

/**
 * Browse events — the first screen of the walkable loop.
 *
 * A client component that talks to /api/v1 rather than a Server Component
 * reading the service directly, for the same reason the persona switcher is
 * one: the Capacitor shell ships a static bundle and runs no server
 * (CLAUDE.md R3). A browse screen that only works when Next renders it is a
 * browse screen the native app does not have.
 *
 * `fetch` and a shallow type guard rather than TanStack Query and Zod, also
 * following the switcher — and for a reason that cost a measurement to learn
 * there: importing the shared Zod schema into a client component put the whole
 * of Zod in the bundle and cost 111 KB of first load. R7 is still satisfied,
 * where it asks to be: the handler parses every request, and the types below
 * are inferred from the same schema file at compile time, where they weigh
 * nothing.
 *
 * Learner register (D12): this is a discovery surface, so it is warm. Category
 * colour appears as a marker dot rather than as a filled pill, because the
 * palette identifies a category and does not rank one.
 */

const CATEGORIES = [
  "academic",
  "arts",
  "sports",
  "service",
  "faith_based",
  "special_interest",
] as const;

type Category = (typeof CATEGORIES)[number];

/**
 * The design system's category names predate the database enum and are shorter
 * on two of six. Mapped here rather than renamed in either place: the enum is
 * in applied migrations, and the token names are in `tokens.css` and
 * `DESIGN_SYSTEM.md`.
 */
const CATEGORY_TOKEN: Record<Category, OrgCategory> = {
  academic: "academic",
  arts: "arts",
  sports: "sports",
  service: "service",
  faith_based: "faith",
  special_interest: "interest",
};

const SCOPES = ["upcoming", "past"] as const;

type Status = "loading" | "ready" | "failed";

/** Shallow, and shallow on purpose: see the note above about the bundle. */
function isListEventsResponse(value: unknown): value is ListEventsResponse {
  if (typeof value !== "object" || value === null) return false;
  const { events } = value as { events?: unknown };
  return (
    Array.isArray(events) &&
    events.every(
      (event) =>
        typeof event === "object" &&
        event !== null &&
        typeof (event as EventSummary).id === "string" &&
        typeof (event as EventSummary).title === "string" &&
        typeof (event as EventSummary).org === "object",
    )
  );
}

export function EventList() {
  const t = useTranslations("events");
  const [scope, setScope] = useState<EventScope>("upcoming");
  const [category, setCategory] = useState<Category | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  // Bumped to re-run the effect when the filters have not changed — which is
  // what "try again" needs, and what calling the fetch from the handler would
  // otherwise duplicate.
  const [attempt, setAttempt] = useState(0);

  /**
   * Filters move the screen back to `loading` here, in the handler, rather than
   * at the top of the effect. A synchronous setState inside an effect body
   * cascades a second render before paint, and React's lint rule rejects it;
   * the state that a click causes belongs with the click regardless.
   */
  const refilter = useCallback((next: () => void) => {
    setStatus("loading");
    next();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const params = new URLSearchParams({ scope });
      if (category) params.set("category", category);

      try {
        const response = await fetch(`/api/v1/events?${params.toString()}`, {
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error(String(response.status));

        const body: unknown = await response.json();
        if (!isListEventsResponse(body)) throw new Error("shape");

        if (cancelled) return;
        setEvents(body.events);
        setStatus("ready");
      } catch {
        // No detail is surfaced or logged: a failure here can only be a network
        // error or a session that expired, and neither is improved by an error
        // string on a learner's screen (CLAUDE.md R8).
        if (!cancelled) setStatus("failed");
      }
    }

    void load();
    // A fast tap through the category row leaves several requests in flight;
    // without this the slowest one wins and the list disagrees with the chips.
    return () => {
      cancelled = true;
    };
  }, [scope, category, attempt]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2" role="group" aria-label={t("scopeLabel")}>
          {SCOPES.map((value) => (
            <Chip
              key={value}
              selected={scope === value}
              onToggle={() => refilter(() => setScope(value))}
            >
              {t(`scope.${value}`)}
            </Chip>
          ))}
        </div>

        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          role="group"
          aria-label={t("categoryLabel")}
        >
          <Chip selected={category === null} onToggle={() => refilter(() => setCategory(null))}>
            {t("category.all")}
          </Chip>
          {CATEGORIES.map((value) => (
            <Chip
              key={value}
              category={CATEGORY_TOKEN[value]}
              selected={category === value}
              onToggle={() => refilter(() => setCategory(category === value ? null : value))}
            >
              {t(`category.${value}`)}
            </Chip>
          ))}
        </div>
      </div>

      {status === "loading" ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-28" label={t("loading")} />
          <Skeleton variant="block" className="h-28" />
          <Skeleton variant="block" className="h-28" />
        </div>
      ) : null}

      {status === "failed" ? (
        <EmptyState
          title={t("failed.title")}
          description={t("failed.description")}
          action={
            <Button variant="secondary" onClick={() => refilter(() => setAttempt((n) => n + 1))}>
              {t("failed.retry")}
            </Button>
          }
        />
      ) : null}

      {status === "ready" && events.length === 0 ? (
        <EmptyState title={t(`empty.${scope}.title`)} description={t(`empty.${scope}.description`)} />
      ) : null}

      {status === "ready" && events.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function EventCard({ event }: { event: EventSummary }) {
  const t = useTranslations("events");
  const format = useFormatter();
  const startsAt = new Date(event.startsAt);
  const category = CATEGORY_TOKEN[event.org.category as Category];

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip category={category}>{t(`category.${event.org.category}`)}</Chip>
          <span className="type-small text-ink-muted">{event.org.name}</span>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="type-h3 text-ink">{event.title}</h2>
          {/* `dateTime` carries the machine-readable value; the visible text is
              localized, so a screen reader and a learner get the same moment. */}
          <time className="type-small text-ink-muted" dateTime={event.startsAt}>
            {format.dateTime(startsAt, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
          {event.venue ? <p className="type-small text-ink-muted">{event.venue}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {event.capacity === null ? null : (
            <span className="type-small text-ink-muted">
              {t("capacity", { count: event.capacity })}
            </span>
          )}

          {event.viewerRegistrationStatus ? (
            <Badge tone={event.viewerRegistrationStatus === "registered" ? "success" : "neutral"}>
              {t(`registration.${event.viewerRegistrationStatus}`)}
            </Badge>
          ) : (
            // Phase 0 shows the path without walking it. Registration is a
            // Phase 2 slice with capacity, eligibility and a waitlist behind
            // it, and a button that wrote a row now would be the thin end of
            // building Phase 2 early. Disabled rather than hidden, so the demo
            // can point at where it will be.
            <Button variant="secondary" disabled>
              {t("register.soon")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
