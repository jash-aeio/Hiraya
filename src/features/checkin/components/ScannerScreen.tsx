"use client";

import { ArrowLeft, Camera, Check, CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Avatar, Badge, Button, Card, EmptyState, Input, Skeleton } from "@/design";
import { fixturesEnabled } from "@/lib/fixtures";
import type { RosterEntry } from "@/features/registration/schema";

import {
  checkedInCount,
  feedbackFor,
  filterRoster,
  markCheckedIn,
  nextToScan,
  sendFailedFeedback,
} from "./scanFeedback";
import type { ScanFeedback } from "./scanFeedback";
import type { CheckinResult } from "../schema";

/**
 * The gate (P-02, D24, FR-4.2, FR-4.9).
 *
 * **This is a simulate-scan button standing where the camera goes**, and the
 * screen says so rather than pretending otherwise. `src/lib/qr` does not exist
 * until Phase 3 and the Ed25519 keypair is deliberately empty; a demo-grade
 * unsigned token path is exactly the shape CLAUDE.md R5 forbids, and it would
 * have to be deleted rather than extended. The XP that results is real all the
 * same, and still cites a real check-in row.
 *
 * What is already the Phase 3 shape:
 *
 *   - Every scan carries a client-generated `jti`, and a scan that failed to
 *     send **keeps its `jti`** so tapping again replays it rather than creating
 *     a second check-in. The server de-duplicates on
 *     `(event_id, profile_id, jti)` (CLAUDE.md R6).
 *   - A duplicate is reported as a fact, not a failure — 200 with
 *     `xpAwarded: 0`. A red screen at the gate is how an officer learns to
 *     distrust the scanner and starts waving a queue through unscanned.
 *   - The result is colour **and** icon **and** a word, legible at arm's
 *     length, and announced through a live region
 *     (DESIGN_SYSTEM.md §8).
 *
 * What is deliberately absent: an offline queue and a queue banner. Phase 0 is
 * online only, and an indicator that always reads "Queued: 0" would be a
 * promise the code has not made yet (Phase 3, `hiraya-offline-scenario-tester`).
 *
 * Staff register — no medals, no celebration, and no animation on the scan
 * path: at 15 scans a minute a 250ms flourish is six wasted seconds an hour and
 * an officer who stops reading the feedback.
 */

type Status = "loading" | "ready" | "failed";

type LastScan = { feedback: ScanFeedback; displayName: string };

function isRosterResponse(value: unknown): value is { entries: RosterEntry[]; capacity: number | null } {
  if (typeof value !== "object" || value === null) return false;
  const { entries } = value as { entries?: unknown };
  return (
    Array.isArray(entries) &&
    entries.every(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as RosterEntry).profileId === "string" &&
        typeof (entry as RosterEntry).displayName === "string",
    )
  );
}

function isCheckinResult(value: unknown): value is CheckinResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Partial<CheckinResult>;
  return typeof result.status === "string" && typeof result.xpAwarded === "number";
}

export function ScannerScreen({ eventId }: { eventId: string }) {
  const t = useTranslations("checkin");
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [query, setQuery] = useState("");
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const [last, setLast] = useState<LastScan | null>(null);

  /**
   * One `jti` per learner per attempt, kept until that scan lands. A retry
   * after a dropped connection must replay the same scan rather than make a
   * second one — that is the whole reason the server's idempotency key is
   * `(event_id, profile_id, jti)` and not a fresh id per request (R6).
   */
  const [pendingJti] = useState(() => new Map<string, string>());

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        if (fixturesEnabled) {
          const { fixtureRoster } = await import("./fixtures");
          if (cancelled) return;
          setEntries(fixtureRoster());
          setStatus("ready");
          return;
        }

        const response = await fetch(`/api/v1/events/${eventId}/roster`, {
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error(String(response.status));

        const body: unknown = await response.json();
        if (!isRosterResponse(body)) throw new Error("shape");

        if (cancelled) return;
        setEntries(body.entries);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const scan = useCallback(
    async (entry: RosterEntry): Promise<void> => {
      const jti = pendingJti.get(entry.profileId) ?? crypto.randomUUID();
      pendingJti.set(entry.profileId, jti);
      setBusyProfileId(entry.profileId);

      const scannedAt = new Date().toISOString();

      try {
        let result: CheckinResult;

        if (fixturesEnabled) {
          const { fixtureCheckinResult } = await import("./fixtures");
          result = fixtureCheckinResult(entry.profileId, jti, entry.checkedInAt !== null);
        } else {
          const response = await fetch("/api/v1/checkins", {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({
              eventId,
              profileId: entry.profileId,
              jti,
              scannedAt,
              direction: "in",
              method: "officer_scan",
            }),
          });

          const body: unknown = await response.json();
          const payload = (body as { result?: unknown }).result;
          if (!response.ok || !isCheckinResult(payload)) throw new Error("send");
          result = payload;
        }

        const feedback = feedbackFor(result);
        setLast({ feedback, displayName: entry.displayName });

        if (feedback.counted) {
          // The scan is server-side now, so the retry key is spent.
          pendingJti.delete(entry.profileId);
          setEntries((current) => markCheckedIn(current, entry.profileId, scannedAt));
        }
      } catch {
        // The jti stays in the map: the next tap on this learner replays this
        // scan rather than creating a second one.
        setLast({ feedback: sendFailedFeedback(), displayName: entry.displayName });
      } finally {
        setBusyProfileId(null);
      }
    },
    [eventId, pendingJti],
  );

  const visible = useMemo(() => filterRoster(entries, query), [entries, query]);
  const next = useMemo(() => nextToScan(entries), [entries]);
  const counted = checkedInCount(entries);
  const expected = entries.filter((entry) => entry.status === "registered").length;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/checkin"
        className="type-small -ml-1 inline-flex min-h-11 w-fit items-center gap-1.5 px-1 text-primary hover:text-primary-hover"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("back")}
      </Link>

      {status === "loading" ? (
        <Skeleton variant="block" className="h-64" label={t("roster.loading")} />
      ) : null}

      {status === "failed" ? (
        <EmptyState title={t("roster.failed.title")} description={t("roster.failed.description")} />
      ) : null}

      {status === "ready" ? (
        <>
          <Card elevation="flat">
            <div className="flex flex-col gap-4">
              {/* The camera's place, named as what it is. The demo script
                  narrates this button as the scan (D24). */}
              <div className="flex items-center gap-3">
                <Camera className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="type-body-strong text-ink">{t("scanner.title")}</p>
                  <p className="type-small text-ink-muted">{t("scanner.standsIn")}</p>
                </div>
              </div>

              <p className="type-numeral text-ink" data-numeric>
                {t("scanner.count", { counted, expected })}
              </p>

              <Button
                fullWidth
                size="lg"
                leadingIcon={<Camera className="size-5" aria-hidden="true" />}
                disabled={next === null}
                loading={next !== null && busyProfileId === next.profileId}
                onClick={() => next && void scan(next)}
              >
                {next === null ? t("scanner.allIn") : t("scanner.simulate")}
              </Button>

              {/* Announced, not only shown: an officer looking at the queue
                  rather than the phone still hears the result, and a screen
                  reader is told without having to hunt for what changed. */}
              <div aria-live="polite" className="min-h-16">
                {last ? <ScanResultPanel last={last} /> : (
                  <p className="type-small text-ink-muted">{t("scanner.idle")}</p>
                )}
              </div>
            </div>
          </Card>

          <section className="flex flex-col gap-3">
            <h2 className="type-h3 text-ink">{t("roster.title")}</h2>

            <Input
              label={t("roster.search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              inputMode="search"
            />

            {visible.length === 0 ? (
              <p className="type-small text-ink-muted">{t("roster.noMatch")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {visible.map((entry) => (
                  <li key={entry.profileId} className="flex items-center gap-3 py-2">
                    <Avatar
                      name={entry.displayName}
                      src={entry.avatarKey ? `/avatars/${entry.avatarKey}.svg` : undefined}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="type-body text-ink">{entry.displayName}</p>
                      <p className="type-small text-ink-muted">
                        {entry.gradeLevel === null
                          ? (entry.section ?? "")
                          : t("roster.gradeSection", {
                              grade: entry.gradeLevel,
                              section: entry.section ?? "",
                            })}
                      </p>
                    </div>

                    {entry.status === "waitlisted" ? (
                      <Badge tone="neutral">{t("roster.waitlisted")}</Badge>
                    ) : entry.checkedInAt !== null ? (
                      // Still scannable. A learner presenting an ID twice is
                      // ordinary at a gate, and the answer must be a calm
                      // "already in" rather than a control that has vanished —
                      // in Phase 3 the camera cannot refuse to look at a QR.
                      <div className="flex items-center gap-2">
                        <Badge tone="success">{t("roster.in")}</Badge>
                        <Button
                          variant="ghost"
                          loading={busyProfileId === entry.profileId}
                          aria-label={t("roster.scanAgainNamed", { name: entry.displayName })}
                          onClick={() => void scan(entry)}
                        >
                          {t("roster.scanAgain")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        loading={busyProfileId === entry.profileId}
                        aria-label={t("roster.checkInNamed", { name: entry.displayName })}
                        onClick={() => void scan(entry)}
                      >
                        {t("roster.checkIn")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

/**
 * The scan result, at arm's length. Colour is the last of the three signals,
 * never the only one: the icon and the word carry it for a colour-blind officer
 * and for a phone in direct sun (DESIGN_SYSTEM.md §8).
 */
function ScanResultPanel({ last }: { last: LastScan }) {
  const t = useTranslations("checkin");
  const { feedback, displayName } = last;

  const tone =
    feedback.tone === "success"
      ? "bg-success-soft text-success"
      : feedback.tone === "neutral"
        ? "bg-surface-sunk text-ink-muted"
        : "bg-danger-soft text-danger";

  const Icon =
    feedback.tone === "success" ? CircleCheck : feedback.tone === "neutral" ? Check : CircleAlert;

  return (
    <div className={`flex items-center gap-3 rounded-lg p-3 ${tone}`}>
      <Icon className="size-6 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="type-body-strong">{t(feedback.key)}</p>
        <p className="type-small">
          {feedback.xpAwarded > 0
            ? t("result.withXp", { name: displayName, xp: feedback.xpAwarded })
            : displayName}
        </p>
      </div>
    </div>
  );
}
