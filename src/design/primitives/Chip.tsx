"use client";

import type { ReactNode } from "react";

import { cn } from "../cn";

export type OrgCategory = "academic" | "arts" | "sports" | "service" | "faith" | "interest";

/**
 * Category colour is applied as a small marker dot rather than as the chip's
 * background: the palette identifies a category, it does not rank one
 * (DESIGN_SYSTEM.md §10), and six saturated pills in a filter row read as a
 * league table.
 */
const CATEGORY_DOT: Record<OrgCategory, string> = {
  academic: "bg-cat-academic",
  arts: "bg-cat-arts",
  sports: "bg-cat-sports",
  service: "bg-cat-service",
  faith: "bg-cat-faith",
  interest: "bg-cat-interest",
};

export type ChipProps = {
  children: ReactNode;
  /** Filter chips are toggles, so they are rendered as buttons with aria-pressed. */
  selected?: boolean;
  onToggle?: () => void;
  category?: OrgCategory;
  className?: string;
};

export function Chip({ children, selected = false, onToggle, category, className }: ChipProps) {
  const dot = category ? (
    <span className={cn("size-2 shrink-0 rounded-full", CATEGORY_DOT[category])} aria-hidden="true" />
  ) : null;

  const shell = cn(
    // `shrink-0` because a chip row is a flex container: without it the items
    // shrink to their min-width and clip their own labels rather than letting
    // the row scroll. English never showed this and Filipino did immediately,
    // which is the whole argument for auditing both locales.
    "type-small inline-flex shrink-0 items-center gap-2 rounded-full border px-3 font-semibold",
    selected
      ? "border-primary bg-primary-soft text-primary-ink"
      : "border-border bg-surface text-ink-muted",
    className,
  );

  if (!onToggle) {
    return (
      <span className={cn(shell, "py-1.5")}>
        {dot}
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      // A filter row of 44px-tall pills eats a third of a 360x800 screen, so the
      // chip stays visually small and gains its touch target from padding.
      //
      // `min-w-11` for the same reason in the other axis, and it took a real
      // measurement to notice: the height was already handled, but a short
      // label like "All" came out 41px wide and failed the 44px minimum while
      // every longer chip beside it passed.
      className={cn(
        shell,
        "min-h-11 min-w-11 justify-center py-1.5 transition-colors duration-[var(--duration-feedback)]",
      )}
    >
      {dot}
      {children}
    </button>
  );
}
