/**
 * The XP mark (ASSET_CHECKLIST 1.4) and the top-three podium frame.
 *
 * Both are small enough that a shared file beats two imports.
 */

/**
 * The amber mark that sits before an XP value. Decorative: the number beside it
 * carries the meaning, and `--xp` is a decorative token — amber *text* must use
 * `--xp-ink`, which is why nothing here paints a glyph.
 */
export function XpCoin({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="7" fill="#f5a524" />
      <circle cx="8" cy="8" r="5.2" fill="none" stroke="#c9861a" strokeWidth="0.9" />
      <path
        d="M8 4.4 9.05 6.7l2.55.3-1.9 1.72.52 2.5L8 9.98l-2.22 1.24.52-2.5L4.4 7l2.55-.3Z"
        fill="#6b4600"
      />
    </svg>
  );
}

/**
 * The leaderboard podium, first place raised.
 *
 * Three blocks and no faces: a podium that draws people has to decide what they
 * look like, and this product does not put learners' likenesses on screen
 * (D13). The ranks are numerals so the frame reads without colour.
 */
export function Podium({ size = 160, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 0.625}
      viewBox="0 0 160 100"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* second */}
      <rect x="8" y="46" width="44" height="50" rx="6" fill="#cfd6e4" />
      <text x="30" y="76" textAnchor="middle" fontSize="20" fontWeight="700" fill="#5a6472">
        2
      </text>
      {/* first */}
      <rect x="58" y="26" width="44" height="70" rx="6" fill="#f5a524" />
      <text x="80" y="66" textAnchor="middle" fontSize="24" fontWeight="800" fill="#6b4600">
        1
      </text>
      {/* third */}
      <rect x="108" y="58" width="44" height="38" rx="6" fill="#e0c3a0" />
      <text x="130" y="84" textAnchor="middle" fontSize="18" fontWeight="700" fill="#7a4f00">
        3
      </text>
    </svg>
  );
}
