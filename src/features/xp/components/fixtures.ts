import type { ListXpResponse } from "../schema";

/**
 * Fixture data for the learner XP screen, loaded only when
 * `NEXT_PUBLIC_HIRAYA_FIXTURES=on` (src/lib/fixtures.ts) and imported
 * dynamically so an unset deployment never fetches this chunk.
 *
 * **Deleted with D-03.** Pick a state with `?preview=`:
 *
 *   /xp                  a learner mid-ladder, with a correction in the list
 *   /xp?preview=new      no XP yet — the empty state
 *   /xp?preview=top      Bayani, with nothing left to climb to
 */

export const XP_PREVIEWS = ["earning", "new", "top"] as const;

export type XpPreview = (typeof XP_PREVIEWS)[number];

export function isXpPreview(value: string | null): value is XpPreview {
  return value !== null && (XP_PREVIEWS as readonly string[]).includes(value);
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

const SEASON = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "First Quarter" };

export function fixtureXp(preview: XpPreview): ListXpResponse {
  if (preview === "new") {
    return {
      balance: { lifetimeXp: 0, seasonXp: 0, level: null, season: SEASON },
      entries: [],
    };
  }

  if (preview === "top") {
    return {
      balance: {
        lifetimeXp: 1250,
        seasonXp: 310,
        level: {
          number: 4,
          title: "Bayani",
          badgeKey: "level-4",
          thresholdXp: 1000,
          nextThresholdXp: null,
        },
        season: SEASON,
      },
      entries: [
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
          delta: 15,
          sourceType: "checkin",
          participationType: "organize_event",
          reversalOf: null,
          reason: null,
          createdAt: daysAgo(1),
          source: {
            checkinId: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
            eventId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
            eventTitle: "District Meet send-off",
            orgName: "Palaro Athletics Club",
            occurredAt: daysAgo(1),
          },
        },
      ],
    };
  }

  return {
    balance: {
      lifetimeXp: 180,
      seasonXp: 95,
      level: {
        number: 2,
        title: "Lingkod",
        badgeKey: "level-2",
        thresholdXp: 150,
        nextThresholdXp: 400,
      },
      season: SEASON,
    },
    entries: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
        delta: 10,
        sourceType: "checkin",
        participationType: "attend_event",
        reversalOf: null,
        reason: null,
        createdAt: daysAgo(2),
        source: {
          checkinId: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
          eventId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
          eventTitle: "Coastal clean-up drive",
          orgName: "Science Club",
          occurredAt: daysAgo(2),
        },
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
        delta: 5,
        sourceType: "feedback",
        participationType: "event_feedback",
        reversalOf: null,
        reason: null,
        createdAt: daysAgo(2),
        source: {
          checkinId: null,
          eventId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
          eventTitle: "Coastal clean-up drive",
          orgName: "Science Club",
          occurredAt: null,
        },
      },
      {
        // A correction. The ledger is append-only, so a mistaken award is fixed
        // by a negative row citing the original, never by an edit (R4) — and
        // the screen has to be able to show one.
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4",
        delta: -10,
        sourceType: "reversal",
        participationType: null,
        reversalOf: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5",
        reason: "Scanned at the wrong gate",
        createdAt: daysAgo(6),
        source: null,
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5",
        delta: 10,
        sourceType: "checkin",
        participationType: "attend_event",
        reversalOf: null,
        reason: null,
        createdAt: daysAgo(6),
        source: {
          checkinId: "cccccccc-cccc-4ccc-8ccc-ccccccccccc5",
          eventId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd5",
          eventTitle: "Kindness Week assembly",
          orgName: "Sinag Fellowship",
          occurredAt: daysAgo(6),
        },
      },
    ],
  };
}
