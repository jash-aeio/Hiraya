import "server-only";

import type { Session } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/client";

import { selectBalance, selectEntries } from "./queries";
import type { ListXpQuery, ListXpResponse } from "./schema";

/**
 * XP business logic (D-03, FR-5.1, FR-5.4, FR-5.11).
 *
 * Thin, and honestly so. The level thresholds and their Filipino titles are
 * `levels` rows resolved by the `xp_balances` view, not constants here —
 * thresholds are product parameters the pilot tunes, and a title is a school's
 * own word for its learners. The one decision this file makes is which window
 * the entries are read in, and it makes it in one place so the balance and the
 * list cannot disagree about which season is current.
 */

export async function listMyXp(
  session: Session,
  query: ListXpQuery,
): Promise<ListXpResponse> {
  return withTenant(session, async (tx) => {
    const balance = await selectBalance(tx, session.profileId);

    // `season` narrows to the season the balance just reported as current, so
    // the header and the list are always describing the same period. A school
    // with no current season narrows to nothing, which is lifetime — the only
    // honest answer when there is no season to be in.
    const seasonId = query.window === "season" ? (balance.season?.id ?? null) : null;

    const entries = await selectEntries(tx, session.profileId, {
      seasonId,
      limit: query.limit,
    });

    return { balance, entries };
  });
}
