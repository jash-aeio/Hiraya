import { cn } from "../cn";

export type AvatarSize = "sm" | "md" | "lg";

const SIZES: Record<AvatarSize, string> = {
  sm: "size-8 type-small",
  md: "size-11 type-body-strong",
  lg: "size-16 type-numeral",
};

export type AvatarProps = {
  /** Display name — used for the initial and as the accessible name. */
  name: string;
  /**
   * Path to a curated SVG from the avatar set. There are no photo uploads: that
   * would create a moderation queue for images of minors (CLAUDE.md §6).
   */
  src?: string;
  size?: AvatarSize;
  className?: string;
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  // Grapheme-naive on purpose: it is one visual character of a name the learner
  // typed, not an identifier, and Intl.Segmenter for one letter is not the trade.
  const initial = name.trim().charAt(0).toLocaleUpperCase();

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-primary-soft font-bold text-primary-ink",
        SIZES[size],
        className,
      )}
    >
      {src ? (
        /* A curated SVG from our own origin at a fixed size. next/image would add a
           loader and a request layer to an asset already a few hundred bytes, and
           there is nothing to optimize in vector art. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" aria-hidden="true" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
