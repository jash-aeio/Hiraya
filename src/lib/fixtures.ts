/**
 * The seam between a merged contract and a shipped endpoint.
 *
 * Lane P builds a screen upward from `features/<f>/schema.ts` while Lane D
 * builds the endpoint downward from the same file (docs/WORKSTREAMS.md §2).
 * Between those two moments the screen exists and the route does not, and this
 * flag is what lets the screen be run, audited at 360×800 and reviewed anyway
 * instead of waiting for the other lane.
 *
 * It is **off unless `NEXT_PUBLIC_HIRAYA_FIXTURES` is exactly `on`**, so a
 * deployment that never sets it — CI, Vercel, the demo — has no fixture path at
 * all. Every caller loads its fixture module with a dynamic `import()` inside
 * the branch, so the data is a separate chunk that an unset deployment never
 * fetches and the 500 KB first-load budget never pays for.
 *
 * **This file is deleted when D-01…D-04 land**, along with every
 * `components/fixtures.ts` beside it. A fixture path that outlives the endpoint
 * it stood in for is a second source of truth for what the API returns.
 */
export const fixturesEnabled = process.env.NEXT_PUBLIC_HIRAYA_FIXTURES === "on";
