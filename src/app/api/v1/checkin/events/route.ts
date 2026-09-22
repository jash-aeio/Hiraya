import { defineRoute } from "@/lib/api/route";
import { SCANNER_ROLES, listScannableEvents } from "@/features/checkin/service";
import type { ListScannableEventsResponse } from "@/features/checkin/schema";

/**
 * GET /api/v1/checkin/events — what this officer may scan for right now.
 *
 * The scanner opens on this list rather than on every event in the school,
 * because a picker showing all of them is how a learner gets checked into the
 * wrong event — and a wrong-event check-in is the correction the XP screen
 * already has to render.
 */
export const GET = defineRoute({
  roles: [...SCANNER_ROLES],
  handler: async ({ session }): Promise<ListScannableEventsResponse> =>
    listScannableEvents(session),
});
