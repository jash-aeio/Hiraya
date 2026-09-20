import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

/**
 * Locale resolution. Cookie-based rather than path-prefixed (`/fil/events`)
 * because the Capacitor shell serves one bundle from the app's own origin, and a
 * locale segment in the URL would need the same routing to exist in both.
 *
 * English ships first; the Filipino catalogue is filled in Phase 2 (D6). The
 * catalogues exist now so that no string is ever written outside one — retrofitting
 * i18n across a finished UI is the refactor that never happens.
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
