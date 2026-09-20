import { getTranslations } from "next-intl/server";

/**
 * Phase 0 placeholder. Deliberately plain: the learner and adviser surfaces are
 * designed against docs/DESIGN_SYSTEM.md, and a page invented ahead of that
 * becomes the thing everything else is quietly matched to.
 *
 * Every string comes from the catalogue. There are no bare literals in JSX in
 * this repository, starting here.
 */
export default async function HomePage() {
  const t = await getTranslations("landing");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-lg text-slate-700 dark:text-slate-300">{t("subheading")}</p>
      </header>

      <section
        aria-labelledby="phase-heading"
        className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"
      >
        <h2 id="phase-heading" className="text-sm font-medium uppercase tracking-wide">
          {t("phaseLabel")}
        </h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300">{t("phaseBody")}</p>
      </section>

      <p>
        <a className="underline underline-offset-4" href="/api/v1/health">
          {t("healthLink")}
        </a>
      </p>
    </main>
  );
}
