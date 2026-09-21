import "server-only";

import { resolveDemoSession } from "@/lib/auth/demo-session";
import { errors } from "@/lib/errors";

import { selectDemoPersonas } from "./queries";
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

  return {
    profileId: session.claims.profileId,
    displayName: session.displayName,
  };
}
