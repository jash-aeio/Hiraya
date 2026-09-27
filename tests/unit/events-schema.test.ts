import { describe, expect, it } from "vitest";

import { listEventsQuerySchema } from "@/features/events/schema";

/**
 * The browse query arrives as `URLSearchParams`, so every value reaching this
 * schema is a string. That is the whole reason it needs a test: a `z.number()`
 * where a `z.coerce.number()` belongs fails on every real request and on no
 * hand-written object.
 */

describe("listEventsQuerySchema", () => {
  it("defaults to the next twenty upcoming events", () => {
    expect(listEventsQuerySchema.parse({})).toEqual({ scope: "upcoming", limit: 20 });
  });

  it("coerces a limit that arrived as a string", () => {
    expect(listEventsQuerySchema.parse({ limit: "5" }).limit).toBe(5);
  });

  it("caps the limit rather than trusting the caller", () => {
    expect(() => listEventsQuerySchema.parse({ limit: "5000" })).toThrow();
  });

  it("accepts the six org categories and nothing else", () => {
    expect(listEventsQuerySchema.parse({ category: "faith_based" }).category).toBe("faith_based");
    expect(() => listEventsQuerySchema.parse({ category: "faith" })).toThrow();
  });

  it("refuses an orgId that is not a uuid", () => {
    // The value reaches a WHERE clause. Drizzle parameterizes it, so this is
    // about a clear 422 rather than about injection.
    expect(() => listEventsQuerySchema.parse({ orgId: "../../etc/passwd" })).toThrow();
  });

  it("refuses an unknown scope instead of silently browsing upcoming", () => {
    expect(() => listEventsQuerySchema.parse({ scope: "archived" })).toThrow();
  });

  it("accepts each event_status value, so a staff surface can ask for the queue", () => {
    for (const status of ["draft", "pending", "approved", "rejected", "cancelled", "completed"]) {
      expect(listEventsQuerySchema.parse({ status }).status).toBe(status);
    }
  });

  it("refuses a status outside the enum", () => {
    expect(() => listEventsQuerySchema.parse({ status: "awaiting" })).toThrow();
  });

  it("leaves status unset by default, so browse is unfiltered by lifecycle", () => {
    // Load-bearing: a default of "approved" would look harmless and would hide
    // an officer's own drafts on the browse screen, which the SELECT policy
    // deliberately shows them (src/db/rls/events.sql).
    expect(listEventsQuerySchema.parse({}).status).toBeUndefined();
  });
});
