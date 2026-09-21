import { getTranslations } from "next-intl/server";

import { Gallery } from "./Gallery";

/**
 * The design system, rendered. Three jobs:
 *   1. the Phase 0 review point in docs/ASSET_CHECKLIST.md — look at the authored
 *      style in the real UI, on a real phone, before Phase 1 begins
 *   2. the surface `hiraya-mobile-audit` runs against, since it puts every
 *      primitive into one accessibility tree at 360x800
 *   3. the answer to "is there already a primitive for this?"
 *
 * Staff register: this is documentation, so it stays calm and never celebrates.
 */
export default async function DesignPage() {
  const t = await getTranslations("design");

  return (
    <main data-register="staff" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="type-display text-ink">{t("title")}</h1>
      <p className="type-body mt-2 text-ink-muted">{t("intro")}</p>
      <Gallery />
    </main>
  );
}
