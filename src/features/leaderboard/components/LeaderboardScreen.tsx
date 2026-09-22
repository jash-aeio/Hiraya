"use client";

import { EyeOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Avatar, Card, Chip, EmptyState, Skeleton } from "@/design";
import { fixturesEnabled } from "@/lib/fixtures";

import { isTopThree, scopeHeading, shouldExplainHidden, viewerPlacement } from "./boardView";
import type { LeaderboardResponse, LeaderboardRow, LeaderboardScope } from "../schema";

/**
 * The leaderboard (P-04, FR-5.6, FR-5.8).
 *
 * Three scopes here, not four. Section, grade and school are boards a learner
 * can ask for with nothing but their own profile; the **organization** board
 * needs an org id, and which of a learner's several orgs it should default to
 * is a product rule nobody has written. It is reached from the org profile
 * screen instead, where the id is already in hand (P-12, Phase 1). The contract
 * carries all four scopes regardless — this is a UI decision, not a narrowing
 * of the API.
 *
 * Two rules are load-bearing and both live in `boardView.ts`:
 *
 *   **Everyone always sees their own rank**, hidden or not, and a learner
 *   already in the visible rows is not shown twice.
 *   **A hidden learner is told why they are missing** from the public rows.
 *   Without the sentence, the honest conclusion is that the ranking is broken.
 *
 * Learner register (D12), but a restrained one. This is the screen most likely
 * to discourage the learners the platform exists to reach, so a rank is stated
 * plainly and a learner with no points is "not ranked yet" rather than last.
 */

const SCOPES: LeaderboardScope[] = ["section", "grade", "school"];

type Status = "loading" | "ready" | "failed";

function isBoard(value: unknown): value is LeaderboardResponse {
  if (typeof value !== "object" || value === null) return false;
  const board = value as Partial<LeaderboardResponse>;
  return typeof board.scope === "string" && Array.isArray(board.rows);
}

export function LeaderboardScreen() {
  const t = useTranslations("leaderboard");
  const [scope, setScope] = useState<LeaderboardScope>("section");
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const reload = useCallback((next: LeaderboardScope) => {
    setStatus("loading");
    setScope(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        if (fixturesEnabled) {
          const { fixtureBoard, isBoardPreview } = await import("./fixtures");
          const requested = new URLSearchParams(window.location.search).get("preview");
          if (cancelled) return;
          setBoard(fixtureBoard(scope, isBoardPreview(requested) ? requested : "in-rows"));
          setStatus("ready");
          return;
        }

        const response = await fetch(`/api/v1/leaderboard?scope=${scope}`, {
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error(String(response.status));

        const body: unknown = await response.json();
        if (!isBoard(body)) throw new Error("shape");

        if (cancelled) return;
        setBoard(body);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const heading = board ? scopeHeading(board) : null;
  const placement = board ? viewerPlacement(board) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2" role="group" aria-label={t("scopeLabel")}>
        {SCOPES.map((value) => (
          <Chip key={value} selected={scope === value} onToggle={() => reload(value)}>
            {t(`scope.${value}`)}
          </Chip>
        ))}
      </div>

      {status === "loading" ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-16" label={t("loading")} />
          <Skeleton variant="block" className="h-16" />
          <Skeleton variant="block" className="h-16" />
        </div>
      ) : null}

      {status === "failed" || !board ? (
        status === "failed" ? (
          <EmptyState title={t("failed.title")} description={t("failed.description")} />
        ) : null
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="type-h3 text-ink">
              {heading?.ref ? t(heading.key, { ref: heading.ref }) : t(heading?.key ?? "heading.school")}
            </h2>
            {board.season ? (
              <p className="type-small text-ink-muted">{t("season", { name: board.season.name })}</p>
            ) : null}
          </div>

          {board.rows.length === 0 ? (
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
            <ol className="flex flex-col gap-2">
              {board.rows.map((row) => (
                <li key={row.profileId}>
                  <BoardRow row={row} />
                </li>
              ))}
            </ol>
          )}

          {placement?.kind === "pinned" ? (
            <div className="flex flex-col gap-2">
              <p className="type-label text-ink-muted">{t("yours")}</p>
              <BoardRow
                row={{
                  rank: placement.viewer.rank ?? 0,
                  profileId: placement.viewer.profileId,
                  displayName: t("you"),
                  avatarKey: null,
                  gradeLevel: null,
                  section: null,
                  xp: placement.viewer.xp,
                  levelTitle: placement.viewer.levelTitle,
                  isViewer: true,
                }}
              />
            </div>
          ) : null}

          {placement?.kind === "unranked" ? (
            <Card elevation="flat">
              <p className="type-body text-ink">{t("unranked.title")}</p>
              <p className="type-small mt-1 text-ink-muted">{t("unranked.description")}</p>
            </Card>
          ) : null}

          {shouldExplainHidden(board) ? (
            // The word and the icon, never colour alone (DESIGN_SYSTEM.md §8).
            <p className="type-small inline-flex items-start gap-1.5 text-ink-muted">
              <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t("hiddenNote")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function BoardRow({ row }: { row: LeaderboardRow }) {
  const t = useTranslations("leaderboard");

  return (
    <Card elevation={row.isViewer ? "sm" : "flat"} padding="md">
      <div className="flex items-center gap-3">
        {/* The rank is a numeral first. Top-three weight is type, not colour,
            so the order survives greyscale and a colour-blind reader. */}
        <span
          className={`w-8 shrink-0 text-center ${isTopThree(row) ? "type-h3 text-xp-ink" : "type-body text-ink-muted"}`}
          data-numeric
        >
          {row.rank}
        </span>

        <Avatar
          name={row.displayName}
          src={row.avatarKey ? `/avatars/${row.avatarKey}.svg` : undefined}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <p className="type-body text-ink">{row.displayName}</p>
          <p className="type-small text-ink-muted">
            {[row.levelTitle, row.section, row.gradeLevel === null ? null : t("grade", { grade: row.gradeLevel })]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <span className="type-body-strong shrink-0 text-ink" data-numeric>
          {t("xp", { xp: row.xp })}
        </span>
      </div>
    </Card>
  );
}
