import { listPersonas } from "@/features/demo/service";
import { defineRoute } from "@/lib/api/route";

/**
 * GET /api/v1/demo/personas — the personas the Phase 0 switcher may offer (D23).
 *
 * Public, because choosing who to be is what happens *before* there is a
 * session. That is only defensible because the underlying function cannot see a
 * school that is not flagged `is_demo`: on a deployment with no synthetic
 * tenant this endpoint returns an empty list, which is the correct amount of
 * information for an unauthenticated stranger to receive.
 */
export const GET = defineRoute({
  public: true,
  handler: () => listPersonas(),
});
