import { startSessionInputSchema } from "@/features/demo/schema";
import type { EndSessionResponse, StartSessionResponse } from "@/features/demo/schema";
import { startSession } from "@/features/demo/service";
import { defineRoute } from "@/lib/api/route";
import { clearDemoPersonaCookie, setDemoPersonaCookie } from "@/lib/auth/demo-session";

/**
 * POST /api/v1/demo/session — become a demo persona (D23).
 * DELETE /api/v1/demo/session — stop being one.
 *
 * Public for the same reason a login endpoint is: there is no session yet. The
 * body names a profile and nothing else — no school, no roles. Everything the
 * session then carries is read from the database by
 * `public.demo_session_claims`, whose `is_demo` filter is the gate. An endpoint
 * that accepted claims here would hand any caller any tenant, which is the
 * failure src/db/rls/00_functions.sql opens by naming.
 */
export const POST = defineRoute({
  public: true,
  input: startSessionInputSchema,
  handler: async ({ input }): Promise<StartSessionResponse> => {
    // The service decides; the cookie is only set once it has said yes.
    const session = await startSession(input.profileId);
    await setDemoPersonaCookie(session.profileId);
    return session;
  },
});

export const DELETE = defineRoute({
  public: true,
  handler: async (): Promise<EndSessionResponse> => {
    // Unconditional: leaving is never refused, and clearing a cookie that was
    // never set is not an error worth a status code.
    await clearDemoPersonaCookie();
    return { ended: true };
  },
});
