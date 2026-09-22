"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge, Card, EmptyState, LevelBadge, ProgressBar, Skeleton, XpCoin } from "@/design";
import { fixturesEnabled } from "@/lib/fixtures";

import { entryLabel, isVerifiable, levelProgress, levelTier } from "./xpView";
import type { ListXpResponse, XpEntry } from "../schema";

/**
 * The learner's XP screen (P-03) — the screen that makes the load-bearing
 * claim visible: *a point in Hiraya means a teacher confirmed you were there.*
 *
 * Which is why every row names its source, and why a row that cannot be traced
 * to a check-in says so instead of borrowing the authority of one. A leaderboard
 * is only worth looking at if this screen answers "where did that come from?",
 * and answering it here is cheaper than defending it later.
 *
 * Learner register (D12): the level badge, the amber XP mark and a progress bar
 * belong here — this is the surface that celebrates. The numbers still come
 * from the ledger, and a correction renders as a correction.
 */

type Status = "loading" | "ready" | "failed";

function isXpResponse(value: unknown): value is ListXpResponse {
  if (typeof value !== "object" || value === null) return false;
  const { balance, entries } = value as { balance?: unknown; entries?: unknown };
  return (
    typeof balance === "object" &&
    balance !== null &&
    typeof (balance as ListXpResponse["balance"]).lifetimeXp === "number" &&
    Array.isArray(entries)
  );
}

export function XpScreen() {
  const t = useTranslations("xp");
  const [data, setData] = useState<ListXpResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        if (fixturesEnabled) {
          const { fixtureXp, isXpPreview } = await import("./fixtures");
          const requested = new URLSearchParams(window.location.search).get("preview");
          if (cancelled) return;
          setData(fixtureXp(isXpPreview(requested) ? requested : "earning"));
          setStatus("ready");
          return;
        }

        const response = await fetch("/api/v1/me/xp", { headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(String(response.status));

        const body: unknown = await response.json();
        if (!isXpResponse(body)) throw new Error("shape");

        if (cancelled) return;
        setData(body);
        setStatus("ready");
      } catch {
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
      <div className="flex flex-col gap-4">
        <Skeleton variant="block" className="h-44" label={t("loading")} />
        <Skeleton variant="block" className="h-32" />
      </div>
    );
  }

  if (status === "failed" || !data) {
    return <EmptyState title={t("failed.title")} description={t("failed.description")} />;
  }

  const { balance, entries } = data;
  const tier = levelTier(balance.level?.number ?? null);
  const progress = levelProgress(balance);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {tier === null ? null : <LevelBadge tier={tier} size={64} />}
            <div className="min-w-0">
              <p className="type-label text-ink-muted">{t("levelLabel")}</p>
              {/* Filipino level titles are names, not descriptions, and are not
                  translated (FR-5.4). They come from the `levels` table, so a
                  school can rename its own. */}
              <p className="type-h2 text-ink">{balance.level?.title ?? t("noLevel")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="type-numeral text-ink" data-numeric>
              {t("lifetime", { xp: balance.lifetimeXp })}
            </span>
            {balance.season ? (
              <span className="type-small text-ink-muted">
                {t("season", { name: balance.season.name, xp: balance.seasonXp })}
              </span>
            ) : null}
          </div>

          <ProgressBar
            value={progress.value}
            max={progress.max}
            label={progress.atTop ? t("progress.top") : t("progress.label")}
            valueLabel={
              // At the top the readout is the level's own title, read from the
              // `levels` row rather than from the catalogue: a school may
              // rename its levels, and a hard-coded "Bayani" would then be
              // wrong on exactly the screen that celebrates reaching it.
              progress.atTop
                ? (balance.level?.title ?? undefined)
                : progress.remaining === null
                  ? undefined
                  : t("progress.remaining", { xp: progress.remaining })
            }
          />
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="type-h3 text-ink">{t("history")}</h2>
          <p className="type-small text-ink-muted">{t("historyNote")}</p>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            title={t("empty.title")}
            description={t("empty.description")}
            art={
              /* Static art from `public/`, fetched lazily, so it costs the JS
                 budget nothing (ASSET_CHECKLIST.md). */
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/empty/no-checkins.svg" width={140} height={112} alt="" loading="lazy" />
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <LedgerRow entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LedgerRow({ entry }: { entry: XpEntry }) {
  const t = useTranslations("xp");
  const format = useFormatter();
  const label = entryLabel(entry);
  const verified = isVerifiable(entry);
  const negative = entry.delta < 0;

  return (
    <Card elevation="flat" padding="md">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="type-body text-ink">
            {label.event
              ? t(label.key, { event: label.event })
              : t(label.key)}
          </p>
          <p className="type-small text-ink-muted">
            {label.org ? `${label.org} · ` : ""}
            <time dateTime={entry.createdAt}>
              {format.dateTime(new Date(entry.createdAt), {
                month: "short",
                day: "numeric",
              })}
            </time>
          </p>
          {entry.reason ? <p className="type-small mt-1 text-ink-muted">{entry.reason}</p> : null}

          {verified ? (
            // The claim, on the row that makes it. Icon and word both, never
            // colour alone (DESIGN_SYSTEM.md §8).
            <p className="type-small mt-1 inline-flex items-center gap-1 text-ink-muted">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {t("verified")}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {negative ? null : <XpCoin size={18} />}
          <span
            className={`type-body-strong ${negative ? "text-ink-muted" : "text-xp-ink"}`}
            data-numeric
          >
            {t(negative ? "deltaNegative" : "deltaPositive", { xp: Math.abs(entry.delta) })}
          </span>
        </div>
      </div>

      {negative ? (
        <div className="mt-2">
          <Badge tone="neutral">{t("correction")}</Badge>
        </div>
      ) : null}
    </Card>
  );
}
