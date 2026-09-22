import { z } from "zod";

import { defineRoute } from "@/lib/api/route";
import { getEvent } from "@/features/events/service";
import type { GetEventResponse } from "@/features/events/schema";

const eventParams = z.object({ eventId: z.uuid() });

/**
 * GET /api/v1/events/:id — one event, with the caller's own registration
 * (docs/SYSTEM_DESIGN.md §5, P-01).
 *
 * No role list, for the same reason as the collection: what a caller may see is
 * decided by `events_select_published_or_insiders`, and a role check here would
 * be a second, weaker copy of that rule.
 */
export const GET = defineRoute({
  params: eventParams,
  handler: async ({ session, params }): Promise<GetEventResponse> =>
    getEvent(session, params.eventId),
});
