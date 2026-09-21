/**
 * Conditional class joiner.
 *
 * Deliberately not `clsx` + `tailwind-merge`: two dependencies to join strings
 * is not a trade this project makes (CLAUDE.md §10.6). The cost is that a
 * `className` passed by a caller does not *override* a component's own utility
 * of the same kind — Tailwind resolves conflicts by stylesheet order, not by the
 * order of the class attribute. So primitives expose variant props for anything
 * meant to be changed, and `className` is for additions: layout, margin, width.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
