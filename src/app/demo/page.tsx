import { getTranslations } from "next-intl/server";

import { Badge, registerAttrs } from "@/design";
import { PersonaPicker } from "@/features/demo/components/PersonaPicker";

/**
 * /demo — choose a persona (D23).
 *
 * The Phase 0 demo has to walk the whole loop before Phase 1 auth exists, and
 * this is the door into it. What it is not is a login bypass: every persona it
 * offers comes from a school flagged `is_demo`, the claims are read from the
 * database, and every screen behind it runs under the same policies the pilot
 * will (src/db/rls/02_demo_session.sql).
 *
 * It carries the DEMO DATA marker itself rather than relying on the one in the
 * root layout, which only appears once a session exists. This page lists more
 * synthetic names, grades and sections at once than any other — it is the
 * richest screenshot in the feature, and it is taken before anyone has chosen a
 * persona. The privacy audit caught that the layout's marker cannot cover it.
 *
 * Staff register: a calm utility surface. The playful register belongs to the
 * learner screens this switches into.
 */
export default async function DemoPage() {
  const t = await getTranslations("demo");

  return (
    <main
      {...registerAttrs("staff")}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10"
    >
      <header className="flex flex-col items-start gap-2">
        <Badge tone="warning">{t("marker")}</Badge>
        <p className="type-label text-ink-muted">{t("label")}</p>
        <h1 className="type-h1 text-ink">{t("title")}</h1>
        <p className="type-body text-ink-muted">{t("intro")}</p>
      </header>

      <PersonaPicker />
    </main>
  );
}
