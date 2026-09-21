import { cn } from "../cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

/*
 * Deliberately a separate module from Button.tsx, and deliberately without
 * "use client": a Server Component must be able to style a `next/link` as a
 * button, and everything exported from a client module is a client reference
 * that a server render cannot call. The first attempt put this in Button.tsx and
 * the landing page answered 500.
 */

const BASE =
  "inline-flex touch-target items-center justify-center gap-2 type-body-strong " +
  "transition-colors duration-[var(--duration-feedback)] ease-[var(--ease-standard)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/*
 * The primary CTA is a full pill and the others are not. That is the reference's
 * signature (DESIGN_SYSTEM.md §4) and it also does accessibility work: shape,
 * not only colour, says which action is the main one.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "rounded-full bg-primary text-ink-inverse hover:bg-primary-hover",
  secondary: "rounded-md border border-border bg-surface text-ink hover:bg-surface-sunk",
  ghost: "rounded-md text-primary-ink hover:bg-primary-soft",
  danger: "rounded-md bg-danger text-ink-inverse hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-4",
  lg: "min-h-13 px-6",
};

/** For a `next/link` that must look like a button. Prefer `<Button>` for actions. */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}
