import { defineRoute } from "@/lib/api/route";
import { SCANNER_ROLES, recordCheckin } from "@/features/checkin/service";
import { recordCheckinBodySchema } from "@/features/checkin/schema";
import type { RecordCheckinResponse } from "@/features/checkin/schema";

/**
 * POST /api/v1/checkins — one scan (FR-4.5, D24).
 *
 * Phase 3 adds `POST /checkins/sync`, which is an array of exactly this and
 * returns an array of exactly this result: per-item, never all-or-nothing, so
 * one bad scan in a replayed queue cannot reject the forty good ones around it.
 * That is why `checkinResultSchema` is shaped per item from the start.
 *
 * A duplicate answers 200 with `xpAwarded: 0`, not an error
 * (src/lib/errors.ts). The officer did nothing wrong, and a red screen at the
 * gate teaches them to distrust the scanner.
 */
export const POST = defineRoute({
  roles: [...SCANNER_ROLES],
  input: recordCheckinBodySchema,
  handler: async ({ session, input }): Promise<RecordCheckinResponse> =>
    recordCheckin(session, input),
});
