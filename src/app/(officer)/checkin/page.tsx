import { getTranslations } from "next-intl/server";

import { registerAttrs } from "@/design";
import { EventPicker } from "@/features/checkin/components/EventPicker";

/**
 * /checkin — which gate am I on (P-02).
 *
 * Staff register (D12). An officer running a gate is working, not
 * participating: the screen is calm and dense, and the celebration belongs on
 * the learner's XP screen, where the point lands.
 */
export default async function CheckinPage() {
  const t = await getTranslations("checkin");

  return (
    <main
      {...registerAttrs("staff")}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8"
    >
      <header className="flex flex-col gap-1">
        <p className="type-label text-ink-muted">{t("label")}</p>
        <h1 className="type-h1 text-ink">{t("title")}</h1>
        <p className="type-body text-ink-muted">{t("intro")}</p>
      </header>

      <EventPicker />
    </main>
  );
}
