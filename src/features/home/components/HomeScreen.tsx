"use client";

import { ArrowRight, CalendarDays, MapPin, Radio } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import {
  Avatar,
  Badge,
  Card,
  CategoryTile,
  Chip,
  EmptyState,
  LevelBadge,
  ProgressBar,
  Skeleton,
  StatStrip,
  StatTile,
  XpCoin,
} from "@/design";
import type { OrgCategory } from "@/design";
import type { EventSummary, ListEventsResponse } from "@/features/events/schema";
import type { LeaderboardResponse } from "@/features/leaderboard/schema";
import { levelProgress, levelTier } from "@/features/xp/components/xpView";
import type { ListXpResponse } from "@/features/xp/schema";

import { greetingKey, joinedUpcoming, leadEvent, podium, rankReadout } from "../homeView";
import type { LeadEvent } from "../homeView";

/**
 * The learner's Home dashboard (P-17) — the screen the Home tab has pointed at
 * a Phase 0 placeholder since 2026-09-21.
 *
 * It is the reference's dashboard vocabulary translated for a phone, exactly as
 * DESIGN_SYSTEM.md §7 lays out: hero card, snap-scroll stat strip, leaderboard
 * before anything secondary, 2-up category tiles. Learner register (D12) — this
 * surface celebrates, and what it celebrates is verified.
 *
 * **No new endpoint.** Three existing ones, fetched in parallel:
 * `/api/v1/me/xp`, `/api/v1/events` and `/api/v1/leaderboard`. That bound is
 * deliberate and is what keeps this a Phase 0 screen rather than the start of
 * Phase 4 — the moment a dashboard needs a new endpoint to look right, it has
 * crossed into a later phase (`MILESTONE_ROADMAP.md` §2, Risks).
 *
 * **`allSettled`, not `all`.** One dead endpoint should cost its own section,
 * not the screen. A learner whose leaderboard call fails still sees their
 * points, which is the half that carries the product's claim.
 *
 * No Zod here, following `EventList`: importing the shared schema into a client
 * component put the whole of Zod in the bundle and cost 111 KB of first load.
 * R7 is satisfied where it asks to be — the handler parses every request, and
 * the types below are inferred from the same schema files at compile time,
 * where they weigh nothing.
 *
 * What is deliberately absent: any streak (FR-5.10 bans them), any duel or
 * friend surface, and any "GO PRO" panel. All three are in the reference and
 * all three are rejected in `DESIGN_SYSTEM.md` §1.
 */

type Status = "loading" | "ready" | "failed";

/** The six tiles, in a fixed order that never reorders by count (§10). */
const CATEGORIES = [
  { key: "academic", token: "academic" },
  { key: "arts", token: "arts" },
  { key: "sports", token: "sports" },
  { key: "service", token: "service" },
  { key: "faith_based", token: "faith" },
  { key: "special_interest", token: "interest" },
] as const satisfies readonly { key: string; token: OrgCategory }[];

/**
 * The database enum and the design system's category names differ on two of
 * six. Mapped rather than renamed in either place, for the reason `EventList`
 * gives: the enum is in applied migrations and the token names are in
 * `tokens.css`.
 */
const CATEGORY_TOKENS: Record<string, OrgCategory> = {
  academic: "academic",
  arts: "arts",
  sports: "sports",
  service: "service",
  faith_based: "faith",
  special_interest: "interest",
};

/** Shallow, and shallow on purpose: see the note above about the bundle. */
function isXpResponse(value: unknown): value is ListXpResponse {
  if (typeof value !== "object" || value === null) return false;
  const { balance } = value as { balance?: unknown };
  return (
    typeof balance === "object" &&
    balance !== null &&
    typeof (balance as ListXpResponse["balance"]).lifetimeXp === "number"
  );
}

function isEventsResponse(value: unknown): value is ListEventsResponse {
  if (typeof value !== "object" || value === null) return false;
  return Array.isArray((value as { events?: unknown }).events);
}

function isLeaderboardResponse(value: unknown): value is LeaderboardResponse {
  if (typeof value !== "object" || value === null) return false;
  return Array.isArray((value as { rows?: unknown }).rows);
}

async function getJson<T>(url: string, guard: (value: unknown) => value is T): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(String(response.status));
  const body: unknown = await response.json();
  if (!guard(body)) throw new Error("shape");
  return body;
}

export function HomeScreen({ displayName }: { displayName: string }) {
  const t = useTranslations("home");

  const [xp, setXp] = useState<ListXpResponse | null>(null);
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const [xpResult, eventsResult, boardResult] = await Promise.allSettled([
        getJson("/api/v1/me/xp", isXpResponse),
        getJson("/api/v1/events?scope=upcoming&limit=20", isEventsResponse),
        getJson("/api/v1/leaderboard?scope=school&limit=3", isLeaderboardResponse),
      ]);

      if (cancelled) return;

      if (xpResult.status === "fulfilled") setXp(xpResult.value);
      if (eventsResult.status === "fulfilled") setEvents(eventsResult.value.events);
      if (boardResult.status === "fulfilled") setBoard(boardResult.value);

      // Only a clean sweep is a failed screen. Anything less degrades to the
      // sections that did answer.
      const allFailed = [xpResult, eventsResult, boardResult].every((r) => r.status === "rejected");
      setStatus(allFailed ? "failed" : "ready");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Every branch below renders exactly one `h1`. The screen has three states
  // and a heading that only exists in one of them is a heading that vanishes
  // from the document outline while a learner waits on mobile data.
  if (status === "loading") {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="sr-only">{t("title")}</h1>
        <Skeleton variant="block" className="h-40" label={t("loading")} />
        <Skeleton variant="block" className="h-24" />
        <Skeleton variant="block" className="h-32" />
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

  const now = new Date();
  const greeting = t(`greeting.${greetingKey(now.getHours())}`, { name: displayName });
  const lead = events ? leadEvent(events, now) : null;
  const rank = rankReadout(board?.viewer ?? null);
  const top = board ? podium(board.rows) : [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="type-label text-ink-muted">{t("label")}</p>
        <h1 className="type-h1 text-ink">{greeting}</h1>
      </header>

      {xp ? <XpHero balance={xp.balance} /> : null}

      <StatStrip label={t("stats.label")}>
        <StatTile
          label={t("stats.season")}
          value={xp ? t("stats.points", { xp: xp.balance.seasonXp }) : t("stats.none")}
          hint={xp?.balance.season?.name ?? undefined}
        />
        <StatTile
          label={t("stats.rank")}
          value={
            rank.kind === "ranked" ? t("stats.rankValue", { rank: rank.rank }) : t("stats.none")
          }
          hint={rank.kind === "ranked" ? t("stats.rankHint") : t("stats.unranked")}
        />
        <StatTile
          label={t("stats.joined")}
          value={events ? String(joinedUpcoming(events)) : t("stats.none")}
          hint={t("stats.joinedHint")}
        />
      </StatStrip>

      {lead ? <LeadEventCard lead={lead} /> : null}

      <section className="flex flex-col gap-3">
        <SectionHeading title={t("board.title")} href="/leaderboard" linkLabel={t("board.all")} />
        {top.length === 0 ? (
          <Card>
            <p className="type-body text-ink-muted">{t("board.empty")}</p>
          </Card>
        ) : (
          <Card>
            <ol className="flex flex-col gap-3">
              {top.map((row) => (
                <li key={row.profileId} className="flex items-center gap-3">
                  {/* Rank sits in a column, so tabular figures are right here:
                      a 1 and a 2 must occupy the same width down the list. */}
                  <span className="type-body-strong w-5 shrink-0 text-ink-muted" data-numeric>
                    {row.rank}
                  </span>
                  <Avatar
                    name={row.displayName}
                    src={row.avatarKey ? `/avatars/${row.avatarKey}.svg` : undefined}
                    size="sm"
                  />
                  <span className="type-body min-w-0 flex-1 truncate text-ink">
                    {row.displayName}
                  </span>
                  {row.isViewer ? <Badge tone="neutral">{t("board.you")}</Badge> : null}
                  <span className="type-body-strong shrink-0 text-xp-ink" data-numeric>
                    {t("stats.points", { xp: row.xp })}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading title={t("browse.title")} href="/events" linkLabel={t("browse.all")} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <CategoryTile
              key={category.key}
              category={category.token}
              label={t(`browse.categories.${category.key}`)}
              href={`/events?category=${category.key}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function XpHero({ balance }: { balance: ListXpResponse["balance"] }) {
  const t = useTranslations("home");
  const tier = levelTier(balance.level?.number ?? null);
  const progress = levelProgress(balance);

  return (
    <Card elevation="md">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {tier === null ? null : <LevelBadge tier={tier} size={56} />}
          <div className="min-w-0 flex-1">
            <p className="type-label text-ink-muted">{t("hero.label")}</p>
            {/*
              The one hero figure on this view, and proportional rather than
              tabular: `tabular-nums` gives every digit the width of a zero,
              which is right for the rank column below and loose on a standalone
              headline. The token layer makes it opt-in, so this does not opt in.
            */}
            <p className="type-display text-ink">{t("hero.xp", { xp: balance.lifetimeXp })}</p>
            <p className="type-small text-ink-muted">{balance.level?.title ?? t("hero.noLevel")}</p>
          </div>
          <XpCoin size={28} />
        </div>

        <ProgressBar
          value={progress.value}
          max={progress.max}
          label={progress.atTop ? t("hero.top") : t("hero.progress")}
          valueLabel={
            progress.atTop
              ? (balance.level?.title ?? undefined)
              : progress.remaining === null
                ? undefined
                : t("hero.remaining", { xp: progress.remaining })
          }
        />

        {/* The load-bearing claim, on the screen that leads with the number it
            produces (CLAUDE.md §1). */}
        <p className="type-small text-ink-muted">{t("hero.verified")}</p>
      </div>
    </Card>
  );
}

function LeadEventCard({ lead }: { lead: LeadEvent }) {
  const t = useTranslations("home");
  const format = useFormatter();
  const { event, live } = lead;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        title={live ? t("lead.liveTitle") : t("lead.nextTitle")}
        href="/events"
        linkLabel={t("lead.all")}
      />
      <Card elevation="md">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="type-h2 text-ink">{event.title}</h3>
              <p className="type-small text-ink-muted">{event.org.name}</p>
            </div>
            {/* Icon and word, never colour alone (§8). */}
            {live ? (
              <Badge tone="success">
                <Radio className="size-3.5" aria-hidden="true" />
                {t("lead.live")}
              </Badge>
            ) : null}
          </div>

          <dl className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              <dt className="sr-only">{t("lead.when")}</dt>
              <dd className="type-small text-ink-muted">
                <time dateTime={event.startsAt}>
                  {format.dateTime(new Date(event.startsAt), {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </dd>
            </div>
            {event.venue ? (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <dt className="sr-only">{t("lead.where")}</dt>
                <dd className="type-small text-ink-muted">{event.venue}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            <Chip category={CATEGORY_TOKENS[event.org.category] ?? "interest"}>
              {t(`browse.categories.${event.org.category}`)}
            </Chip>
            {event.viewerRegistrationStatus === "registered" ? (
              <Badge tone="info">{t("lead.registered")}</Badge>
            ) : null}
          </div>

          <Link
            href={`/events/${event.id}`}
            className="type-body-strong inline-flex touch-target items-center gap-1 self-start rounded-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t("lead.open")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </section>
  );
}

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="type-h3 text-ink">{title}</h2>
      {/*
        `touch-target` rather than bare text: the mobile audit measured this
        link at 58x18px, under the 44px floor in DESIGN_SYSTEM.md §7. Negative
        inline margin keeps the label optically flush with the card edge while
        the tappable box grows around it, so the fix costs no layout.
      */}
      <Link
        href={href}
        className="type-small -mr-2 inline-flex touch-target items-center justify-end rounded-md px-2 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
