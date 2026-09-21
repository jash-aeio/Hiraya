import "server-only";

/**
 * The second half of the demo gate (D23).
 *
 * `schools.is_demo` is a database fact, and it is the right primary gate — an
 * env var alone would be forgeable by whoever can set one, which is why D23
 * rejected it. But one boolean column is also the *entire* authorization
 * boundary for an endpoint that returns children's names, grades and sections
 * without a session, and after Gate B a real school will live in the same table
 * as the synthetic one. A single wrong row publishes a roster.
 *
 * So both must hold: the tenant says it is a demo, **and** this deployment was
 * configured to serve that particular demo. They fail independently — a
 * database mistake is not enough, and a configuration mistake is not enough.
 * The trigger in src/db/rls/01_guards.sql covers the third case, an existing
 * school being flipped.
 *
 * It fails closed. With `HIRAYA_DEMO_SCHOOLS` unset there are no demo schools
 * at all, so a production deployment that knows nothing about this feature
 * serves nobody — which is the behaviour you want from the variable that stops
 * a roster leak, even though it means a forgotten value looks like an empty
 * demo. `.env.example` carries the value the seeded tenant uses.
 */

export const DEMO_SCHOOLS_ENV = "HIRAYA_DEMO_SCHOOLS";

/**
 * Read per call rather than cached at import: a module-level cache would freeze
 * the value at the first render in dev, and there is nothing here worth the
 * cost of getting that wrong.
 */
export function allowedDemoSchoolSlugs(): ReadonlySet<string> {
  const raw = process.env[DEMO_SCHOOLS_ENV] ?? "";
  return new Set(
    raw
      .split(",")
      .map((slug) => slug.trim().toLowerCase())
      .filter((slug) => slug.length > 0),
  );
}

export function isAllowedDemoSchool(slug: string): boolean {
  return allowedDemoSchoolSlugs().has(slug.trim().toLowerCase());
}
