import { defineRoute } from "@/lib/api/route";
import { pingDatabase } from "@/lib/db/client";

/**
 * GET /api/v1/health — liveness for CI, uptime checks, and the keep-alive ping
 * that stops Supabase pausing the demo project before a pitch (risk R13).
 *
 * Public, and therefore deliberately dull: it reports whether the process is up
 * and whether Postgres answers. No version of a dependency, no environment name,
 * no row counts. An unauthenticated endpoint should tell an attacker nothing
 * they could not learn by loading the home page.
 */
export const GET = defineRoute({
  public: true,
  handler: async () => {
    const database = await pingDatabase().catch(() => false);
    return { status: database ? "ok" : "degraded", database };
  },
});
