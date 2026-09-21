import { getTranslations } from "next-intl/server";

import { Card, CardHeader, buttonClass } from "@/design";

/**
 * Phase 0 placeholder, now wearing the token layer so that the first thing built
 * on the design system is the thing that proves it loads. The learner and adviser
 * surfaces are designed with their slices; this page is not their template.
 *
 * Every string comes from the catalogue. There are no bare literals in JSX in
 * this repository, starting here.
 */
export default async function HomePage() {
  const t = await getTranslations("landing");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="type-display text-ink">{t("heading")}</h1>
        <p className="type-body text-ink-muted">{t("subheading")}</p>
      </header>

      <Card>
        <CardHeader label={t("phaseLabel")} title={t("phaseTitle")} />
        <p className="type-body text-ink-muted">{t("phaseBody")}</p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <a className={buttonClass("primary")} href="/demo">
          {t("demoLink")}
        </a>
        <a className={buttonClass("secondary")} href="/api/v1/health">
          {t("healthLink")}
        </a>
        <a className={buttonClass("ghost")} href="/design">
          {t("designLink")}
        </a>
      </div>
    </main>
  );
}
