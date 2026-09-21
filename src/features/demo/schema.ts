import { z } from "zod";

/**
 * The /api/v1/demo contracts (CLAUDE.md R7).
 *
 * Request and response are typed from this one file, so the picker and the
 * handler cannot drift. Note what a persona deliberately is not: there is no
 * LRN, no email, no user id, and no claim. It is what a switcher must render to
 * let someone choose a role to look at, and nothing further.
 *
 * Every value here describes a synthetic learner — the personas endpoint reads a
 * function that can only see `is_demo` schools. That is what makes rendering a
 * display name acceptable on an unauthenticated surface, and it is a property of
 * the SQL, not of this file.
 */

export const personaSchema = z.object({
  profileId: z.uuid(),
  displayName: z.string(),
  gradeLevel: z.number().int().nullable(),
  section: z.string().nullable(),
  avatarKey: z.string().nullable(),
  /** Database `user_role` values. Labelled through next-intl, never rendered raw. */
  roles: z.array(z.string()),
});

export type Persona = z.infer<typeof personaSchema>;

export const demoSchoolSchema = z.object({
  schoolId: z.uuid(),
  slug: z.string(),
  name: z.string(),
  personas: z.array(personaSchema),
});

export type DemoSchool = z.infer<typeof demoSchoolSchema>;

/**
 * Grouped by school rather than flat. One demo tenant is the normal case, but
 * the gate is `is_demo` and not `is_the_demo`, so a second synthetic tenant is a
 * thing the database permits and the UI should not silently interleave.
 */
export const personasResponseSchema = z.object({
  schools: z.array(demoSchoolSchema),
});

export type PersonasResponse = z.infer<typeof personasResponseSchema>;

export const startSessionInputSchema = z.object({
  profileId: z.uuid(),
});

export type StartSessionInput = z.infer<typeof startSessionInputSchema>;

/**
 * The response carries no claims. The client has no use for them — every check
 * that matters happens in the database against the cookie — and echoing roles
 * back would invite a client to start believing its own copy of them.
 */
export const startSessionResponseSchema = z.object({
  profileId: z.uuid(),
  displayName: z.string(),
});

export type StartSessionResponse = z.infer<typeof startSessionResponseSchema>;

export const endSessionResponseSchema = z.object({
  ended: z.boolean(),
});

export type EndSessionResponse = z.infer<typeof endSessionResponseSchema>;
