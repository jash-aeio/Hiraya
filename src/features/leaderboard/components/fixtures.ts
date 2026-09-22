import type { LeaderboardResponse, LeaderboardScope } from "../schema";

/**
 * Fixture data for the leaderboard screen, loaded only when
 * `NEXT_PUBLIC_HIRAYA_FIXTURES=on` (src/lib/fixtures.ts) and imported
 * dynamically so an unset deployment never fetches this chunk.
 *
 * **Deleted with D-04.** Pick a state with `?preview=`:
 *
 *   /leaderboard                    the viewer is in the visible rows
 *   /leaderboard?preview=below      the viewer is 41st — pinned beneath the board
 *   /leaderboard?preview=hidden     the viewer has hidden themselves (FR-5.8)
 *   /leaderboard?preview=unranked   no points in this scope yet
 *   /leaderboard?preview=empty      nobody has scored yet this season
 *
 * Every name is invented, as everything in a demo tenant is (CLAUDE.md §6).
 */

export const BOARD_PREVIEWS = ["in-rows", "below", "hidden", "unranked", "empty"] as const;

export type BoardPreview = (typeof BOARD_PREVIEWS)[number];

export function isBoardPreview(value: string | null): value is BoardPreview {
  return value !== null && (BOARD_PREVIEWS as readonly string[]).includes(value);
}

const VIEWER_ID = "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa";

const SEASON = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "First Quarter" };

type Seed = {
  name: string;
  xp: number;
  level: string;
  grade: number;
  section: string;
};

const SEEDS: Seed[] = [
  { name: "Bagwis Karagatan", xp: 420, level: "Tagapagtaguyod", grade: 12, section: "HUMSS-A" },
  { name: "Tala Silangan", xp: 385, level: "Lingkod", grade: 12, section: "STEM-B" },
  { name: "Haraya Alindahaw", xp: 350, level: "Lingkod", grade: 11, section: "STEM-A" },
  { name: "Sinag Dagatan", xp: 295, level: "Lingkod", grade: 11, section: "STEM-A" },
  { name: "Malaya Sampaga", xp: 240, level: "Lingkod", grade: 11, section: "ABM-A" },
  { name: "Agila Batisan", xp: 205, level: "Lingkod", grade: 10, section: "Kampupot" },
  { name: "Himig Palaspas", xp: 180, level: "Lingkod", grade: 10, section: "Kampupot" },
];

function rows(scope: LeaderboardScope, viewerAt: number | null) {
  return SEEDS.map((seed, index) => ({
    rank: index + 1,
    profileId:
      viewerAt !== null && index === viewerAt
        ? VIEWER_ID
        : `bbbbbbbb-${String(index + 1).padStart(4, "0")}-4bbb-8bbb-bbbbbbbbbbbb`,
    displayName: viewerAt !== null && index === viewerAt ? "Ligaya Talampas" : seed.name,
    avatarKey: `avatar-${String((index % 14) + 1).padStart(2, "0")}`,
    // A school-wide board is unreadable without them ("who is this Ana?"), and
    // a section board already knows its own section.
    gradeLevel: scope === "section" ? null : seed.grade,
    section: scope === "section" || scope === "grade" ? null : seed.section,
    xp: seed.xp,
    levelTitle: seed.level,
    isViewer: viewerAt !== null && index === viewerAt,
  }));
}

export function fixtureBoard(scope: LeaderboardScope, preview: BoardPreview): LeaderboardResponse {
  const base = {
    scope,
    scopeRef: scope === "section" ? "11-ABM-A" : scope === "grade" ? "11" : null,
    season: SEASON,
    computedAt: new Date().toISOString(),
  };

  if (preview === "empty") {
    return {
      ...base,
      rows: [],
      viewer: { profileId: VIEWER_ID, rank: null, xp: 0, levelTitle: null, hidden: false },
    };
  }

  if (preview === "unranked") {
    return {
      ...base,
      rows: rows(scope, null),
      viewer: { profileId: VIEWER_ID, rank: null, xp: 0, levelTitle: null, hidden: false },
    };
  }

  if (preview === "hidden") {
    // Hidden from the public rows, and still shown their own rank (FR-5.8).
    return {
      ...base,
      rows: rows(scope, null),
      viewer: { profileId: VIEWER_ID, rank: 12, xp: 150, levelTitle: "Lingkod", hidden: true },
    };
  }

  if (preview === "below") {
    return {
      ...base,
      rows: rows(scope, null),
      viewer: { profileId: VIEWER_ID, rank: 41, xp: 60, levelTitle: "Kasapi", hidden: false },
    };
  }

  return {
    ...base,
    rows: rows(scope, 4),
    viewer: { profileId: VIEWER_ID, rank: 5, xp: 240, levelTitle: "Lingkod", hidden: false },
  };
}
