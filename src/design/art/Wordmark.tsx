import { Logomark } from "./Logomark";

/**
 * The horizontal wordmark: logomark, then `hiraya.` set in the app typeface.
 *
 * Deliberately not an SVG file. A wordmark baked into SVG either traces the
 * glyphs (unmaintainable, and a second copy of the typeface's licence question)
 * or carries `<text>` that silently falls back to a system font when the file
 * is loaded through `<img>`, where no stylesheet reaches it. Rendering real
 * text in `--font-sans` is the only version that stays correct.
 *
 * The literal "hiraya." is not an i18n omission. It is a proper noun and the
 * product's name; it reads the same in English and Filipino, and putting a
 * brand mark through the message catalogue would invite someone to translate
 * it. Everything around it — labels, alt text — goes through `next-intl` as
 * usual.
 */

export type WordmarkProps = {
  /** Height of the logomark in px; the type scales with it. */
  size?: number;
  className?: string;
};

export function Wordmark({ size = 28, className }: WordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Logomark size={size} />
      <span
        className="font-extrabold tracking-tight text-primary-ink"
        style={{ fontSize: size * 0.95, lineHeight: 1 }}
      >
        hiraya<span className="text-xp">.</span>
      </span>
    </span>
  );
}
