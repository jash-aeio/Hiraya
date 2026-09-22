import { z } from "zod";

import { defineRoute } from "@/lib/api/route";
import { ROSTER_ROLES, listRoster } from "@/features/registration/service";
import { listRosterQuerySchema } from "@/features/registration/schema";
import type { ListRosterResponse } from "@/features/registration/schema";

const eventParams = z.object({ eventId: z.uuid() });

/**
 * GET /api/v1/events/:id/roster — who is coming, for the people running it.
 *
 * Unlike the two reads above, this one does carry a role list. The policy is
 * still the guarantee — it admits the hosting org's officers and advisers and
 * School Admin, and nobody else — but a learner who reached this URL would
 * otherwise get an empty roster, which reads as "nobody registered" rather than
 * as "not yours to see" (src/lib/auth/session.ts).
 */
export const GET = defineRoute({
  roles: [...ROSTER_ROLES],
  params: eventParams,
  input: listRosterQuerySchema,
  handler: async ({ session, input, params }): Promise<ListRosterResponse> =>
    listRoster(session, params.eventId, input),
});
