import { defineRoute } from "@/lib/api/route";
import { getLeaderboard } from "@/features/leaderboard/service";
import { leaderboardQuerySchema } from "@/features/leaderboard/schema";
import type { LeaderboardResponse } from "@/features/leaderboard/schema";

/**
 * GET /api/v1/leaderboard — four scopes, one season
 * (docs/SYSTEM_DESIGN.md §5).
 *
 * Any authenticated session. There is no role list because a board is meant to
 * be read by the school, and what it contains is decided by
 * `public.leaderboard` — which resolves section and grade from the caller's own
 * profile rather than from the query string, so there is no scope a learner can
 * ask for that would show them somebody else's class.
 */
export const GET = defineRoute({
  input: leaderboardQuerySchema,
  handler: async ({ session, input }): Promise<LeaderboardResponse> =>
    getLeaderboard(session, input),
});
