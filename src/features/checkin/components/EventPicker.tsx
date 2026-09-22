"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge, Card, EmptyState, Skeleton } from "@/design";
import { fixturesEnabled } from "@/lib/fixtures";

import type { ScannableEvent } from "../schema";

/**
 * The scanner's event picker (P-02).
 *
 * A scanner that opens on every event in the school is a scanner that checks
 * learners into the wrong one, so the door into the gate screen is a short list
 * of the events this officer may actually scan for — and an event hours away is
 * shown but not openable, rather than hidden, so an officer arriving early can
 * see that they are in the right place and simply early.
 *
 * Staff register (D12). The officer at a gate is working, not participating:
 * the screen is calm, dense and fast, and the celebration belongs on the
 * learner's XP screen where the point lands.
 */

type Status = "loading" | "ready" | "failed";

function isScannableEvents(value: unknown): value is { events: ScannableEvent[] } {
  if (typeof value !== "object" || value === null) return false;
  const { events } = value as { events?: unknown };
  return (
    Array.isArray(events) &&
    events.every(
      (event) =>
        typeof event === "object" &&
        event !== null &&
        typeof (event as ScannableEvent).id === "string" &&
        typeof (event as ScannableEvent).scannableNow === "boolean",
    )
  );
}

export function EventPicker() {
  const t = useTranslations("checkin");
  const format = useFormatter();
  const [events, setEvents] = useState<ScannableEvent[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        if (fixturesEnabled) {
          const { fixtureScannableEvents } = await import("./fixtures");
          if (cancelled) return;
          setEvents(fixtureScannableEvents());
          setStatus("ready");
          return;
        }

        const response = await fetch("/api/v1/checkin/events", {
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error(String(response.status));

        const body: unknown = await response.json();
        if (!isScannableEvents(body)) throw new Error("shape");

        if (cancelled) return;
        setEvents(body.events);
        setStatus("ready");
      } catch {
        // Officers hit this at a gate with one bar of signal. The message says
        // what to do, and carries no detail that would name a learner (R8).
        if (!cancelled) setStatus("failed");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton variant="block" className="h-24" label={t("picker.loading")} />
        <Skeleton variant="block" className="h-24" />
      </div>
    );
  }

  if (status === "failed") {
    return <EmptyState title={t("picker.failed.title")} description={t("picker.failed.description")} />;
  }

  if (events.length === 0) {
    return <EmptyState title={t("picker.empty.title")} description={t("picker.empty.description")} />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id}>
          <Card elevation="flat">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="type-label text-ink-muted">{event.orgName}</p>
                <h2 className="type-h3 text-ink">{event.title}</h2>
                <time className="type-small text-ink-muted" dateTime={event.startsAt}>
                  {format.dateTime(new Date(event.startsAt), {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
                {event.venue ? <p className="type-small text-ink-muted">{event.venue}</p> : null}
              </div>

              {event.scannableNow ? (
                <Link
                  href={`/checkin/${event.id}`}
                  aria-label={t("picker.openNamed", { title: event.title })}
                  className="type-body-strong inline-flex min-h-11 w-fit items-center gap-1 px-1 text-primary hover:text-primary-hover"
                >
                  {t("picker.open")}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <Badge tone="neutral">{t("picker.notYet")}</Badge>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
