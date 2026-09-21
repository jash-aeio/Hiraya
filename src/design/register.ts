/**
 * The dual visual register (D12, DESIGN_SYSTEM.md §5).
 *
 * Same tokens, same type scale, same spacing on both sides. What differs is
 * mood: learner surfaces celebrate, staff surfaces do not. Advisers judge this
 * platform on whether it saves them paperwork, and a dashboard that greets a
 * teacher with medals reads as a student toy.
 *
 * The register is an attribute on a layout element rather than a React context,
 * because the one thing it changes globally is a CSS variable (see the
 * `[data-register="staff"]` rule in tokens.css) and because a Server Component
 * can set an attribute without becoming a client component to read a context.
 */
export type Register = "learner" | "staff";

/** Spread onto the outermost element of a route group's layout. */
export function registerAttrs(register: Register): { "data-register": Register } {
  return { "data-register": register };
}
