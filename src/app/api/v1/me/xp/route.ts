import { defineRoute } from "@/lib/api/route";
import { listMyXp } from "@/features/xp/service";
import { listXpQuerySchema } from "@/features/xp/schema";
import type { ListXpResponse } from "@/features/xp/schema";

/**
 * GET /api/v1/me/xp — the caller's own points, and where each one came from
 * (docs/SYSTEM_DESIGN.md §5).
 *
 * `/me` rather than `/profiles/:id` deliberately: there is no id in the path to
 * substitute for somebody else's, so the endpoint has no version of itself that
 * reads another learner's ledger. The policy would refuse it anyway; a URL that
 * cannot express the question is better than one that expresses it and is told
 * no.
 */
export const GET = defineRoute({
  input: listXpQuerySchema,
  handler: async ({ session, input }): Promise<ListXpResponse> => listMyXp(session, input),
});
