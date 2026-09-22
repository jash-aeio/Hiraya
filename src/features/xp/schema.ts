import { z } from "zod";

import { participationType, xpSourceType } from "@/db/enums";

/**
 * The XP contracts — `GET /me/xp` (CLAUDE.md R4, R7; FR-5.1, FR-5.2, FR-5.4).
 *
 * The shape exists to make the load-bearing claim visible: *a point in Hiraya
 * means a teacher confirmed you were there*. So every entry carries its source,
 * and a source is not a string of prose — it is the id of the check-in row and
 * the event it happened at, so the screen can say "this point came from this
 * check-in" and a dispute can cite it (FR-5.11).
 *
 * The balance is read from the `xp_balances` view (D19), which is a regular
 * view with `security_invoker = true` and therefore answers under the caller's
 * own policies. It is never a total stored on `profiles`: FR-5.2 says all XP is
 * individual ledger transactions and never an editable total, and a cached
 * column is an editable total wearing a different name.
 */

export const xpSourceTypeSchema = z.enum(xpSourceType.enumValues);
export const participationTypeSchema = z.enum(participationType.enumValues);

export const listXpQuerySchema = z.object({
  /** Lifetime by default; `season` narrows to the current season (FR-5.5). */
  window: z.enum(["lifetime", "season"]).default("lifetime"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListXpQuery = z.infer<typeof listXpQuerySchema>;

/**
 * Levels carry Filipino titles — Kasapi, Lingkod, Tagapagtaguyod, Bayani
 * (FR-5.4). They are `levels` rows, not constants: thresholds are product
 * parameters tuned during the pilot, and a title is a school's word for its
 * own learners.
 *
 * Every field but `number` and `title` is nullable, each for a real case: a
 * learner below the lowest threshold has no level row yet, and a learner at the
 * top has no next threshold to climb to. A progress bar has to render both.
 */
export const levelSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  badgeKey: z.string().nullable(),
  thresholdXp: z.number().int().nonnegative(),
  nextThresholdXp: z.number().int().positive().nullable(),
});

export type Level = z.infer<typeof levelSchema>;

export const xpBalanceSchema = z.object({
  lifetimeXp: z.number().int().nonnegative(),
  seasonXp: z.number().int().nonnegative(),
  /** Null before the first award, or in a school with no `levels` rows seeded. */
  level: levelSchema.nullable(),
  season: z
    .object({
      id: z.uuid(),
      name: z.string(),
    })
    .nullable(),
});

export type XpBalance = z.infer<typeof xpBalanceSchema>;

/**
 * One ledger row, as a learner reads it.
 *
 * `delta` is signed: a reversal is a negative row citing the original
 * (`reversalOf`), never an edit — the ledger has no UPDATE grant for any role,
 * including admins (R4). A screen that only ever renders positive numbers will
 * one day render a correction as an award.
 */
export const xpEntrySchema = z.object({
  id: z.uuid(),
  delta: z.number().int(),
  sourceType: xpSourceTypeSchema,
  participationType: participationTypeSchema.nullable(),
  /** The ledger row this one reverses, for a `reversal` source. */
  reversalOf: z.uuid().nullable(),
  /** Free text from an adviser on a manual adjustment or dispute resolution. */
  reason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  /**
   * What this point can be traced back to. Null only for a manual adjustment,
   * which is the one source that cites an adviser's decision rather than a
   * verified action — and which is audited for exactly that reason.
   */
  source: z
    .object({
      checkinId: z.uuid().nullable(),
      eventId: z.uuid().nullable(),
      eventTitle: z.string().nullable(),
      orgName: z.string().nullable(),
      /** When the officer scanned, not when the row synced. */
      occurredAt: z.iso.datetime().nullable(),
    })
    .nullable(),
});

export type XpEntry = z.infer<typeof xpEntrySchema>;

export const listXpResponseSchema = z.object({
  balance: xpBalanceSchema,
  entries: z.array(xpEntrySchema),
});

export type ListXpResponse = z.infer<typeof listXpResponseSchema>;
