import { getTranslations } from "next-intl/server";

import { registerAttrs } from "@/design";
import { LeaderboardScreen } from "@/features/leaderboard/components/LeaderboardScreen";

/**
 * /leaderboard — where a learner stands (P-04, FR-5.6, FR-5.8).
 *
 * The last screen of the walkable loop, and the one that only means anything
 * because of the three before it: every point on this board traces to a
 * check-in a teacher confirmed.
 */
export default async function LeaderboardPage() {
  const t = await getTranslations("leaderboard");

  return (
    <main
      {...registerAttrs("learner")}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8"
    >
      <header className="flex flex-col gap-1">
        <p className="type-label text-ink-muted">{t("label")}</p>
        <h1 className="type-h1 text-ink">{t("title")}</h1>
        <p className="type-body text-ink-muted">{t("intro")}</p>
      </header>

      <LeaderboardScreen />
    </main>
  );
}
