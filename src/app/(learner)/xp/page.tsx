import { getTranslations } from "next-intl/server";

import { registerAttrs } from "@/design";
import { XpScreen } from "@/features/xp/components/XpScreen";

/**
 * /xp — where a learner's points came from (P-03, FR-5.2, FR-5.4).
 *
 * Learner register (D12): this is the surface that celebrates. It celebrates
 * something verified, which is the only reason the celebration is worth
 * anything — every row names the check-in behind it.
 */
export default async function XpPage() {
  const t = await getTranslations("xp");

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

      <XpScreen />
    </main>
  );
}
