import { z } from "zod";

import { defineRoute } from "@/lib/api/route";
import { cancelRegistration, registerForEvent } from "@/features/registration/service";
import { registerEventBodySchema } from "@/features/registration/schema";
import type {
  CancelRegistrationResponse,
  RegisterEventResponse,
} from "@/features/registration/schema";

const eventParams = z.object({ eventId: z.uuid() });

/**
 * POST /api/v1/events/:id/register (FR-3.3, US-2).
 *
 * A learner registers themselves and nobody else: the profile comes from the
 * claims inside `public.register_for_event`, so there is no field here to
 * carry someone else's id and no check to forget.
 *
 * Registering twice is not an error — an existing seat is returned unchanged.
 * A full event is refused with EVENT_FULL and the waitlist offer; the second
 * call carries `acceptWaitlist: true`.
 */
export const POST = defineRoute({
  params: eventParams,
  input: registerEventBodySchema,
  handler: async ({ session, input, params }): Promise<RegisterEventResponse> =>
    registerForEvent(session, params.eventId, input),
});

/**
 * DELETE /api/v1/events/:id/register — give up a seat or a waitlist place.
 *
 * Returns the cancelled row rather than 204, so a client that gave up a seat
 * and one that left the waitlist can say different things without a second
 * request. Promotion of the next learner happens in the same transaction.
 */
export const DELETE = defineRoute({
  params: eventParams,
  handler: async ({ session, params }): Promise<CancelRegistrationResponse> =>
    cancelRegistration(session, params.eventId),
});
