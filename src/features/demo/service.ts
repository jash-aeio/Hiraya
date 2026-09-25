import "server-only";

import { resolveDemoSession } from "@/lib/auth/demo-session";
import { errors } from "@/lib/errors";

import { rollLiveEvents, selectDemoPersonas } from "./queries";
import type { PersonasResponse, StartSessionResponse } from "./schema";

/**
 * The demo persona switcher (D23).
 *
 * Business logic only: no HTTP, no cookies. The handler sets the cookie once
 * this has said the persona may have a session — which keeps the decision and
 * the mechanism apart, and means a test can assert the decision without a
 * request.
 */

export async function listPersonas(): Promise<PersonasResponse> {
  return { schools: await selectDemoPersonas() };
}

/**
 * Approves a switch, or refuses it.
 *
 * NOT_FOUND rather than FORBIDDEN, and the same NOT_FOUND for every refusal:
 * a real tenant's profile, an archived one, and a made-up id are answered
 * identically. A 403 here would tell a caller that the id they guessed names
 * someone real — the reasoning in src/lib/errors.ts, applied to the one endpoint
 * that takes a profile id from an unauthenticated stranger.
 */
export async function startSession(profileId: string): Promise<StartSessionResponse> {
  const session = await resolveDemoSession(profileId);
  if (!session) throw errors.notFound("persona");

  /*
   * The demo's live event is re-centred on now, here (D-07).
   *
   * Here and not in resolveDemoSession, which is on the path of every guarded
   * request and of two Server Components: this is a write, and a write on a
   * per-request path is a write that runs thousands of times to do the work of
   * one. A persona switch is the moment the demo actually begins, it is already
   * the endpoint that changes something, and its rate is a human tapping.
   *
   * After the allowlist, not before: resolveDemoSession has already refused any
   * school this deployment is not configured for, so the school id below has
   * cleared both of D25's facts before it is handed to a function that writes.
   *
   * The bound worth knowing: a session that outlives the rolled five-hour window
   * — the cookie lasts eight — sees a stale scanner again until the persona is
   * re-picked, which is one tap in the demo bar. Widening the window to cover
   * the cookie would have bought that hour at the cost of an event whose length
   * is no longer the one the seed describes.
   */
  await rollLiveEvents(session.claims.schoolId);

  return {
    profileId: session.claims.profileId,
    displayName: session.displayName,
  };
}
