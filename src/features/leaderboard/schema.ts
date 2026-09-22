import { z } from "zod";

import { leaderboardScope } from "@/db/enums";

/**
 * The leaderboard contracts — `GET /leaderboard`
 * (FR-5.6, FR-5.8; docs/SYSTEM_DESIGN.md §5).
 *
 * Four scopes, one season. Phase 0 computes the board on read; Phase 4 moves it
 * to `leaderboard_snapshots` (docs/WORKSTREAMS.md §5, D-04). The response shape
 * is the same either way, which is the point of settling it here: the move is a
 * query change, not a contract change.
 *
 * Two product rules are visible in the shape rather than left to a screen:
 *
 *   - **A hidden learner is absent from `rows`, and still present in `viewer`.**
 *     FR-5.8 lets a learner hide from public boards and guarantees they always
 *     see their own rank. If hiding were a rendering decision, the ranks would
 *     leak in the payload of every client that asked.
 *   - **`viewer` is separate from `rows` and always returned.** A learner
 *     outside the top N still needs their own standing, and a board that shows
 *     only the top of the school is the board that discourages the learners the
 *     platform exists to reach.
 */

export const leaderboardScopeSchema = z.enum(leaderboardScope.enumValues);

export type LeaderboardScope = z.infer<typeof leaderboardScopeSchema>;

export const leaderboardQuerySchema = z.object({
  scope: leaderboardScopeSchema.default("school"),
  /**
   * The section name, grade level or org id the scope refers to — matching
   * `leaderboard_snapshots.scope_ref`. Omitted for `school`, and omitted for
   * `section` and `grade` too, where the service fills it from the caller's own
   * profile rather than accepting one: a learner asking for another section's
   * board is asking a question the product does not pose.
   */
  scopeRef: z.string().max(100).optional(),
  seasonId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

/**
 * One row of a board.
 *
 * It carries a display name, an avatar and a rank — what a board is for — and
 * nothing that identifies a learner off the platform. `section` and
 * `gradeLevel` appear because a school-wide board is unreadable without them
 * ("who is this Ana?"), and because both are already on every roster pinned to
 * a classroom wall. LRN is not here and is not on `profiles` at all
 * (CLAUDE.md §6).
 */
export const leaderboardRowSchema = z.object({
  rank: z.number().int().positive(),
  profileId: z.uuid(),
  displayName: z.string(),
  avatarKey: z.string().nullable(),
  gradeLevel: z.number().int().nullable(),
  section: z.string().nullable(),
  xp: z.number().int().nonnegative(),
  levelTitle: z.string().nullable(),
  /** True for the caller's own row, so the screen can mark it without a client-side compare. */
  isViewer: z.boolean(),
});

export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>;

/**
 * The caller's own standing, returned whether or not they are in `rows`.
 *
 * `hidden` is the learner's own `hidden_from_boards` setting, echoed so the
 * screen can explain why they are missing from a board they can see themselves
 * on — the alternative is a learner concluding the ranking is broken.
 */
export const leaderboardViewerSchema = z.object({
  profileId: z.uuid(),
  rank: z.number().int().positive().nullable(),
  xp: z.number().int().nonnegative(),
  levelTitle: z.string().nullable(),
  hidden: z.boolean(),
});

export type LeaderboardViewer = z.infer<typeof leaderboardViewerSchema>;

export const leaderboardResponseSchema = z.object({
  scope: leaderboardScopeSchema,
  scopeRef: z.string().nullable(),
  /** Null in a school with no current season — lifetime XP is still ranked. */
  season: z
    .object({
      id: z.uuid(),
      name: z.string(),
    })
    .nullable(),
  rows: z.array(leaderboardRowSchema),
  viewer: leaderboardViewerSchema.nullable(),
  /**
   * When the board was computed. Phase 0 answers "just now"; Phase 4 answers
   * with the snapshot's `computed_at`, and a board that does not say how stale
   * it is invites an argument an adviser has to settle.
   */
  computedAt: z.iso.datetime(),
});

export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
