import "server-only";

import type { Session } from "@/lib/auth/session";
import { withTenant } from "@/lib/db/client";

import { callLeaderboard } from "./queries";
import type { LeaderboardQuery, LeaderboardResponse } from "./schema";

/**
 * Leaderboard business logic (D-04, FR-5.6, FR-5.8).
 *
 * Every rule that decides *what is on a board* lives in
 * `src/db/rls/07_leaderboard.sql`, because a board publishes rows a learner
 * cannot otherwise read and that decision belongs next to the data. What is
 * left here is assembling the two halves the function returns into the shape
 * the contract promises, and marking the caller's own row so the screen does
 * not have to compare ids to find itself.
 */

export async function getLeaderboard(
  session: Session,
  query: LeaderboardQuery,
): Promise<LeaderboardResponse> {
  const rows = await withTenant(session, (tx) => callLeaderboard(tx, query));

  const viewerRow = rows.find((row) => row.l_kind === "viewer");
  const season = rows.find((row) => row.l_season_id !== null);

  return {
    scope: query.scope,
    // Echoed as the function resolved it, not as the caller asked: `section`
    // and `grade` are read from the caller's own profile, so returning the
    // request's value would be a different answer to the one the rows came
    // from.
    scopeRef: query.scope === "org" ? (query.scopeRef ?? null) : null,
    season:
      season?.l_season_id && season.l_season_name
        ? { id: season.l_season_id, name: season.l_season_name }
        : null,
    rows: rows
      .filter((row) => row.l_kind === "row")
      .map((row) => ({
        // Non-null on a 'row': only an earner with visible points is ranked,
        // and only ranked rows are returned as rows.
        rank: row.l_rank ?? 1,
        profileId: row.l_profile_id,
        displayName: row.l_display_name,
        avatarKey: row.l_avatar_key,
        gradeLevel: row.l_grade_level,
        section: row.l_section,
        xp: Math.max(row.l_xp, 0),
        levelTitle: row.l_level_title,
        isViewer: row.l_profile_id === session.profileId,
      })),
    viewer: viewerRow
      ? {
          profileId: viewerRow.l_profile_id,
          rank: viewerRow.l_rank,
          // A negative lifetime total is arithmetically possible after a
          // reversal and is not a thing to show a learner; the contract says
          // non-negative and this is where that is made true.
          xp: Math.max(viewerRow.l_xp, 0),
          levelTitle: viewerRow.l_level_title,
          hidden: viewerRow.l_hidden,
        }
      : null,
    // Phase 0 computes on read, so the board is always current. Phase 4 answers
    // with the snapshot's computed_at, and a board that does not say how stale
    // it is invites an argument an adviser has to settle.
    computedAt: new Date().toISOString(),
  };
}
