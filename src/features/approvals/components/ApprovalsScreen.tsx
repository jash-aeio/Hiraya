"use client";

import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge, Card, EmptyState, Skeleton, StatStrip, StatTile, buttonClass, cn } from "@/design";
import type { EventSummary, ListEventsResponse } from "@/features/events/schema";

import { missedCount, reviewQueue } from "../approvalsView";
import type { QueueRow } from "../approvalsView";

/**
 * The adviser and School Admin dashboard (P-18).
 *
 * **Staff register (D12, DESIGN_SYSTEM.md §5): this surface does not
 * celebrate.** No medals, no level art, no XP coin, no podium, no confetti —
 * `[data-register="staff"]` on the page already collapses `--duration-celebrate`
 * to zero, and nothing here would use it anyway. Category colour appears as a
 * small marker and never as a fill. The hero is the one §5 names outright:
 * *"Pending approvals: 3" with a direct action.*
 *
 * Why that is the hero and not a participation chart: an adviser judges this
 * platform on whether it saves them paperwork. The first thing on their screen
 * should be the work they owe, with the fastest possible path to clearing it.
 *
 * **No new endpoint, and no new policy.** Three reads of `/api/v1/events`,
 * separated only by the `status` filter J-12 added. The SELECT policy on
 * `events` already returns any status to a School Admin, an SSLG officer or
 * adviser, a school head, and to an org's own officers and advisers — so this
 * screen shows a School Admin the whole school's queue and an Org Adviser their
 * own org's, without a line of code here knowing the difference
 * (`src/db/rls/events.sql`).
 *
 * **Read-only, deliberately.** Approving is a write (`POST /events/:id/approve`)
 * and belongs to Phase 2 with the approval flow and its "an adviser cannot
 * approve an event they drafted" rule. Every row here links to the event, which
 * is where that action will live. A button that looked like it approved and did
 * not would be worse than no button.
 */

type Status = "loading" | "ready" | "failed";

function isEventsResponse(value: unknown): value is ListEventsResponse {
  if (typeof value !== "object" || value === null) return false;
  return Array.isArray((value as { events?: unknown }).events);
}

/** Shallow, for the bundle reason `EventList` documents: Zod here costs 111 KB. */
async function getEvents(url: string): Promise<EventSummary[]> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(String(response.status));
  const body: unknown = await response.json();
  if (!isEventsResponse(body)) throw new Error("shape");
  return body.events;
}

export function ApprovalsScreen() {
  const t = useTranslations("approvals");

  const [pending, setPending] = useState<EventSummary[]>([]);
  const [approved, setApproved] = useState<EventSummary[] | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const [upcoming, past, approvedUpcoming] = await Promise.allSettled([
        getEvents("/api/v1/events?status=pending&scope=upcoming&limit=50"),
        // Pending *and* already past. The list endpoint splits on `endsAt`, so
        // an event nobody approved before its date is invisible to the upcoming
        // query — which is exactly the row an adviser most needs to see.
        getEvents("/api/v1/events?status=pending&scope=past&limit=50"),
        getEvents("/api/v1/events?status=approved&scope=upcoming&limit=50"),
      ]);

      if (cancelled) return;

      const rows: EventSummary[] = [];
      if (upcoming.status === "fulfilled") rows.push(...upcoming.value);
      if (past.status === "fulfilled") rows.push(...past.value);
      setPending(rows);
      if (approvedUpcoming.status === "fulfilled") setApproved(approvedUpcoming.value);

      const allFailed = [upcoming, past, approvedUpcoming].every((r) => r.status === "rejected");
      setStatus(allFailed ? "failed" : "ready");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="sr-only">{t("title")}</h1>
        <Skeleton variant="block" className="h-28" label={t("loading")} />
        <Skeleton variant="block" className="h-40" />
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="sr-only">{t("title")}</h1>
        <EmptyState title={t("failed.title")} description={t("failed.description")} />
      </div>
    );
  }

  const queue = reviewQueue(pending, new Date());
  const missed = missedCount(queue);
  const first = queue[0];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="type-label text-ink-muted">{t("label")}</p>
        <h1 className="type-h1 text-ink">{t("title")}</h1>
      </header>

      {/* The hero §5 asks for: the count, and one direct way in. */}
      <Card elevation="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="type-label text-ink-muted">{t("hero.label")}</p>
            <p className="type-display text-ink">{queue.length}</p>
            <p className="type-small text-ink-muted">
              {queue.length === 0
                ? t("hero.clear")
                : missed > 0
                  ? t("hero.withMissed", { count: missed })
                  : t("hero.waiting")}
            </p>
          </div>
          {first ? (
            <Link className={buttonClass("primary")} href={`/events/${first.event.id}`}>
              {t("hero.action")}
            </Link>
          ) : null}
        </div>
      </Card>

      <StatStrip label={t("stats.label")}>
        <StatTile label={t("stats.pending")} value={String(queue.length)} hint={t("stats.pendingHint")} />
        <StatTile label={t("stats.missed")} value={String(missed)} hint={t("stats.missedHint")} />
        <StatTile
          label={t("stats.approved")}
          value={approved ? String(approved.length) : t("stats.none")}
          hint={t("stats.approvedHint")}
        />
      </StatStrip>

      <section className="flex flex-col gap-3">
        <h2 className="type-h3 text-ink">{t("queue.title")}</h2>
        {queue.length === 0 ? (
          <EmptyState title={t("queue.empty.title")} description={t("queue.empty.description")} />
        ) : (
          <Card elevation="flat" padding="none">
            {/* The table scrolls inside its own container, so the page never
                does (DESIGN_SYSTEM.md §7). */}
            <div className="overflow-x-auto">
              {/*
                No `min-width` at 360px. An adviser checking approvals between
                classes must reach Review without scrolling a table sideways,
                so the Organization column is dropped below `md` and the date
                folds into the event cell. The wide table returns at `md`,
                where the staff register's "tables, counts, sortable columns"
                (§5) has the room it assumes.
              */}
              <table className="w-full border-collapse text-left md:min-w-[34rem]">
                <caption className="sr-only">{t("queue.caption")}</caption>
                <thead>
                  <tr className="border-b border-border">
                    <Th>{t("queue.event")}</Th>
                    <Th className="hidden md:table-cell">{t("queue.org")}</Th>
                    <Th className="hidden md:table-cell">{t("queue.when")}</Th>
                    <Th>
                      <span className="sr-only">{t("queue.action")}</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((row) => (
                    <QueueTableRow key={row.event.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("type-label px-4 py-3 text-ink-muted", className)}>
      {children}
    </th>
  );
}

function QueueTableRow({ row }: { row: QueueRow }) {
  const t = useTranslations("approvals");
  const format = useFormatter();
  const { event, urgency } = row;

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="type-body-strong text-ink">{event.title}</span>
          {/* Below `md` the org and date columns are gone, so they fold in
              here rather than being dropped — an adviser needs to know which
              club proposed it and when, on a phone as much as on a laptop. */}
          <span className="type-small text-ink-muted md:hidden">
            {event.org.name} ·{" "}
            <time dateTime={event.startsAt}>
              {format.dateTime(new Date(event.startsAt), {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </span>
          {/* Icon and word, never colour alone (§8) — via `icon`, which
              overrides the tone's own mark rather than adding a second one.
              `missed` is a warning and not a danger: nothing is broken, an
              event simply went unapproved. */}
          {urgency === "missed" ? (
            <Badge tone="warning" icon={<AlertTriangle className="size-3.5" aria-hidden="true" />}>
              {t("queue.missed")}
            </Badge>
          ) : urgency === "soon" ? (
            <Badge tone="info" icon={<Clock className="size-3.5" aria-hidden="true" />}>
              {t("queue.soon")}
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="type-small hidden px-4 py-3 text-ink-muted md:table-cell">{event.org.name}</td>
      <td className="type-small hidden px-4 py-3 text-ink-muted md:table-cell">
        <time dateTime={event.startsAt}>
          {format.dateTime(new Date(event.startsAt), {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/events/${event.id}`}
          className="type-small inline-flex touch-target items-center justify-end gap-1 rounded-md px-2 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {/* The row's own name, not a bare "Review" repeated down the column:
              a screen reader reading the link list otherwise hears "Review"
              eight times with nothing to tell them apart (§8). */}
          <span aria-hidden="true">{t("queue.review")}</span>
          <span className="sr-only">{t("queue.reviewNamed", { event: event.title })}</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}
