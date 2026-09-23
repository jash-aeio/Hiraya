import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

/**
 * Locale resolution. Cookie-based rather than path-prefixed (`/fil/events`)
 * because a locale segment would put the same page behind two URLs, which costs
 * a redirect on every cold load and splits any link a teacher shares. The cookie
 * also survives a home-screen PWA launch, where there is no referring URL to read
 * a prefix from.
 *
 * The catalogues exist so that no string is ever written outside one — retrofitting
 * i18n across a finished UI is the refactor that never happens.
 *
 * **Both are full as of 2026-09-22**: 299 keys each, and the P-06 audit walked
 * every Phase 0 screen in Filipino with no overflow at 360×800. D6 says
 * "Filipino locale in Phase 2" and is now describing the past. What is still
 * missing is a way to *choose* it: nothing but this file reads
 * `HIRAYA_LOCALE`, so Filipino is reachable only by setting the cookie by
 * hand. The switcher lands with the learner's own settings screen (Phase 1).
 */

export const LOCALES = ["en", "fil"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "HIRAYA_LOCALE";

function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const requested = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  const messages = (await import(`./messages/${locale}.json`)).default as Record<string, unknown>;
  return { locale, messages };
});
