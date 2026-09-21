/**
 * The four level badges (DESIGN_SYSTEM.md 9, ASSET_CHECKLIST 1.4).
 *
 * Layered: ribbon, disc, star, pips. Drawn on a 64px grid and legible at 32.
 *
 * Progression runs cool -> warm so advancement reads as warmth rather than as
 * more saturation. Colour alone is not enough — the palette has to survive
 * greyscale and colour-blind viewers — so each tier also carries its number as
 * pips beneath the star. That is the part that makes a Bayani badge readable as
 * *fourth* rather than merely as *yellow*.
 *
 * Titles are Filipino per FR-5.4 and are not translated: they are the names of
 * the levels, not descriptions of them. XP thresholds live in the `levels`
 * table and are tuned during the pilot — nothing about them belongs here.
 */

export type LevelTier = 1 | 2 | 3 | 4;

export const LEVEL_TITLES: Record<LevelTier, string> = {
  1: "Kasapi",
  2: "Lingkod",
  3: "Tagapagtaguyod",
  4: "Bayani",
};

type Palette = { disc: string; ring: string; ribbon: string; mark: string };

const PALETTES: Record<LevelTier, Palette> = {
  // Teal --primary
  1: { disc: "#0d7f7c", ring: "#7fc4c2", ribbon: "#0a6a67", mark: "#ffffff" },
  // Blue --cat-academic
  2: { disc: "#3b6ff6", ring: "#a8c0fb", ribbon: "#2a56cc", mark: "#ffffff" },
  // Purple --cat-faith
  3: { disc: "#8257e6", ring: "#c3abf3", ribbon: "#6a41c8", mark: "#ffffff" },
  // Amber --xp with the deep ribbon the spec calls for. The mark goes dark
  // rather than white: white on amber is about 1.9:1 and would vanish.
  4: { disc: "#f5a524", ring: "#fad28e", ribbon: "#8a5a00", mark: "#6b4600" },
};

const STAR =
  "M32 15 34.35 20.76 40.56 21.22 35.8 25.24 37.29 31.28 32 28 26.71 31.28 28.2 25.24 23.44 21.22 29.65 20.76Z";

export type LevelBadgeProps = {
  tier: LevelTier;
  /** Rendered size in px. Drawn on a 64px grid; do not go below 32. */
  size?: number;
  className?: string;
};

export function LevelBadge({ tier, size = 64, className }: LevelBadgeProps) {
  const p = PALETTES[tier];
  const pips = Array.from({ length: tier }, (_, i) => i);
  const pipSpan = (tier - 1) * 5;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label={LEVEL_TITLES[tier]}
    >
      <path d="M25 40 19 60l7.5-4.5L31 60V40Z" fill={p.ribbon} />
      <path d="M39 40l6 20-7.5-4.5L33 60V40Z" fill={p.ribbon} />
      <circle cx="32" cy="24" r="18" fill={p.disc} />
      <circle cx="32" cy="24" r="13.5" fill="none" stroke={p.ring} strokeWidth="1.5" />
      <path d={STAR} fill={p.mark} />
      {pips.map((i) => (
        <circle key={i} cx={32 - pipSpan / 2 + i * 5} cy="36.5" r="1.6" fill={p.mark} />
      ))}
    </svg>
  );
}

/**
 * The decorative ring a level unlocks (ASSET_CHECKLIST 1.5). Wraps an avatar.
 * Purely cosmetic and purely free, which is the point — FR-5 asks for rewards
 * that cost the school nothing.
 */
export function UnlockFrame({ tier, size = 64, className }: LevelBadgeProps) {
  const p = PALETTES[tier];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="30" stroke={p.disc} strokeWidth="3" />
      {tier >= 2 && <circle cx="32" cy="32" r="26" stroke={p.ring} strokeWidth="1.5" />}
      {tier >= 3 &&
        [0, 90, 180, 270].map((deg) => (
          <circle
            key={deg}
            cx={32 + 30 * Math.cos((deg * Math.PI) / 180)}
            cy={32 + 30 * Math.sin((deg * Math.PI) / 180)}
            r="3"
            fill={p.disc}
          />
        ))}
      {tier === 4 &&
        [45, 135, 225, 315].map((deg) => (
          <circle
            key={deg}
            cx={32 + 30 * Math.cos((deg * Math.PI) / 180)}
            cy={32 + 30 * Math.sin((deg * Math.PI) / 180)}
            r="2"
            fill={p.ribbon}
          />
        ))}
    </svg>
  );
}
