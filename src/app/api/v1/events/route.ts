import { defineRoute } from "@/lib/api/route";
import { listEvents } from "@/features/events/service";
import { listEventsQuerySchema } from "@/features/events/schema";
import type { ListEventsResponse } from "@/features/events/schema";

/**
 * GET /api/v1/events — approved and upcoming, with filters
 * (docs/SYSTEM_DESIGN.md §5).
 *
 * Open to any authenticated session, with no role list: what a caller may see
 * is decided by the SELECT policy on `events`, which shows a learner published
 * events and shows officers and advisers their own org's drafts as well. A role
 * check here would be a second, weaker copy of that rule.
 */
export const GET = defineRoute({
  input: listEventsQuerySchema,
  handler: async ({ session, input }): Promise<ListEventsResponse> => listEvents(session, input),
});
