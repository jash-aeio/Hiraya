import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { checkins, events, organizations, seasons, xpBalances, xpLedger } from "@/db/schema";
import type { TenantTransaction } from "@/lib/db/client";

import type { XpBalance, XpEntry } from "./schema";

/**
 * Reads for the XP feature (D-03, FR-5.1, FR-5.2, FR-5.4).
 *
 * Both reads run under the caller's own policies. `xp_balances` is a regular
 * view declared `security_invoker = true` (D19), so it can show nothing its
 * reader could not already select from `xp_ledger` — which for a learner is
 * their own rows and nobody else's. That is why neither query below carries a
 * `profile_id = me` filter for the totals: the policy is the filter, and a
 * hand-written one would be a second place to be wrong.
 *
 * There is no cached total anywhere. FR-5.2 says all XP is individual ledger
 * transactions and never an editable total, and a denormalized column on
 * `profiles` would be an editable total wearing a different name.
 */

export async function selectBalance(
  tx: TenantTransaction,
  profileId: string,
): Promise<XpBalance> {
  const [row] = await tx
    .select({
      lifetimeXp: xpBalances.lifetimeXp,
      seasonXp: xpBalances.seasonXp,
      currentSeasonId: xpBalances.currentSeasonId,
      levelNumber: xpBalances.levelNumber,
      levelTitle: xpBalances.levelTitle,
      badgeKey: xpBalances.badgeKey,
      levelThresholdXp: xpBalances.levelThresholdXp,
      nextThresholdXp: xpBalances.nextThresholdXp,
      seasonName: seasons.name,
    })
    .from(xpBalances)
    .leftJoin(seasons, eq(seasons.id, xpBalances.currentSeasonId))
    .where(eq(xpBalances.profileId, profileId))
    .limit(1);

  /*
   * No row is the ordinary case for a learner who has not been to anything yet:
   * `xp_balances` has a row only where there were ledger rows to sum
   * (src/db/rls/04_xp_balances.sql says so deliberately, because a zero row
   * would be indistinguishable from "you may not see this learner"). Rendering
   * the absence as 0 XP is the service's job, and this is it.
   */
  if (!row) {
    const [season] = await tx
      .select({ id: seasons.id, name: seasons.name })
      .from(seasons)
      .where(eq(seasons.isCurrent, true))
      .orderBy(desc(seasons.startsOn))
      .limit(1);

    return {
      lifetimeXp: 0,
      seasonXp: 0,
      level: null,
      season: season ? { id: season.id, name: season.name } : null,
    };
  }

  return {
    lifetimeXp: row.lifetimeXp,
    seasonXp: row.seasonXp,
    // Null below the lowest threshold, and in a school with no `levels` rows
    // seeded. The progress bar has to render both.
    level:
      row.levelNumber !== null && row.levelTitle !== null
        ? {
            number: row.levelNumber,
            title: row.levelTitle,
            badgeKey: row.badgeKey,
            thresholdXp: row.levelThresholdXp ?? 0,
            // Null at the top level. The bar reads that as "maxed", not as 0.
            nextThresholdXp: row.nextThresholdXp,
          }
        : null,
    season:
      row.currentSeasonId && row.seasonName
        ? { id: row.currentSeasonId, name: row.seasonName }
        : null,
  };
}

/**
 * The learner's own ledger, newest first, each row carrying what it came from.
 *
 * The joins are what make "this point came from this check-in" true on screen
 * rather than merely claimed. They are LEFT joins and gated on
 * `source_type = 'checkin'`, because the other sources cite other things: a
 * reversal cites the ledger row it reverses, and a manual adjustment cites an
 * adviser's decision and nothing verifiable at all — which is exactly why that
 * one is audited.
 */
export async function selectEntries(
  tx: TenantTransaction,
  profileId: string,
  options: { seasonId: string | null; limit: number },
): Promise<XpEntry[]> {
  const rows = await tx
    .select({
      id: xpLedger.id,
      delta: xpLedger.delta,
      sourceType: xpLedger.sourceType,
      participationType: xpLedger.participationType,
      reversalOf: xpLedger.reversalOf,
      reason: xpLedger.reason,
      createdAt: xpLedger.createdAt,
      checkinId: checkins.id,
      checkinScannedAt: checkins.scannedAt,
      eventId: events.id,
      eventTitle: events.title,
      orgName: organizations.name,
    })
    .from(xpLedger)
    .leftJoin(
      checkins,
      and(eq(checkins.id, xpLedger.sourceId), eq(xpLedger.sourceType, "checkin")),
    )
    .leftJoin(events, eq(events.id, checkins.eventId))
    .leftJoin(organizations, eq(organizations.id, events.orgId))
    .where(
      and(
        eq(xpLedger.profileId, profileId),
        options.seasonId ? eq(xpLedger.seasonId, options.seasonId) : undefined,
      ),
    )
    .orderBy(desc(xpLedger.createdAt))
    .limit(options.limit);

  return rows.map((row) => ({
    id: row.id,
    // Signed, so a reversal renders as a correction rather than as an award
    // (R4). A screen that only ever draws positive numbers will one day draw a
    // correction as points earned.
    delta: row.delta,
    sourceType: row.sourceType,
    participationType: row.participationType,
    reversalOf: row.reversalOf,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    source: row.checkinId
      ? {
          checkinId: row.checkinId,
          eventId: row.eventId,
          eventTitle: row.eventTitle,
          orgName: row.orgName,
          // When the officer scanned, not when the row synced. A queued scan
          // reaches the server hours after the learner was at the gate.
          occurredAt: row.checkinScannedAt?.toISOString() ?? null,
        }
      : null,
  }));
}
