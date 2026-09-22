import "server-only";

import { sql } from "drizzle-orm";
import { z } from "zod";

import type { TenantTransaction } from "@/lib/db/client";

import type { LeaderboardQuery } from "./schema";

/**
 * The board read (D-04).
 *
 * One call to `public.leaderboard` returns both halves — the ranked rows and
 * the caller's own standing — tagged by `l_kind`. They come from one function
 * so the scope, the season and the ranking are decided once
 * (src/db/rls/07_leaderboard.sql).
 *
 * Parsed rather than cast, for the same reason as everywhere else: a change in
 * the function's shape should fail here, loudly, rather than as an undefined
 * rank on a screen.
 */

const boardRow = z.object({
  l_kind: z.enum(["row", "viewer"]),
  l_rank: z.number().int().positive().nullable(),
  l_profile_id: z.uuid(),
  l_display_name: z.string(),
  l_avatar_key: z.string().nullable(),
  l_grade_level: z.number().int().nullable(),
  l_section: z.string().nullable(),
  l_xp: z.number().int(),
  l_level_title: z.string().nullable(),
  l_hidden: z.boolean(),
  l_season_id: z.uuid().nullable(),
  l_season_name: z.string().nullable(),
});

export type BoardRow = z.infer<typeof boardRow>;

export async function callLeaderboard(
  tx: TenantTransaction,
  query: LeaderboardQuery,
): Promise<BoardRow[]> {
  const rows = await tx.execute(
    sql`select * from public.leaderboard(
          ${query.scope}::text,
          ${query.scopeRef ?? null}::text,
          ${query.seasonId ?? null}::uuid,
          ${query.limit}::integer
        )`,
  );

  return z.array(boardRow).parse(rows as unknown as unknown[]);
}
