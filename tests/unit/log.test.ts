import { describe, expect, it } from "vitest";

import { __testing } from "@/lib/log";

const { scrub } = __testing;

describe("log scrubbing (CLAUDE.md R8)", () => {
  it("keeps profile_id, which is the identifier logs are allowed to carry", () => {
    expect(scrub({ profile_id: "abc", event_id: "def" })).toEqual({
      profile_id: "abc",
      event_id: "def",
    });
  });

  it("redacts every denied key", () => {
    const scrubbed = scrub({
      lrn: "123456789012",
      display_name: "A Learner",
      section: "Sampaguita",
      email: "someone@example.com",
      push_token: "abc",
    });
    expect(Object.values(scrubbed)).toEqual([
      "[redacted]",
      "[redacted]",
      "[redacted]",
      "[redacted]",
      "[redacted]",
    ]);
  });

  it("redacts nested fields, where PII actually tends to hide", () => {
    const scrubbed = scrub({ profile: { id: "abc", displayName: "A Learner" } });
    expect(scrubbed).toEqual({ profile: { id: "abc", displayName: "[redacted]" } });
  });
});

describe("scrubbing inside arrays", () => {
  it("redacts a denied key one level inside an array of objects", () => {
    // The guard used to recurse into plain objects only, so a list of people
    // walked straight past it. Nothing logs this shape today; the point is that
    // the day something does, the denylist still holds.
    const out = __testing.scrub({
      people: [{ display_name: "Fixture Name", profile_id: "p1" }],
    });

    const people = (out.people as { display_name: string; profile_id: string }[])[0];
    expect(people?.display_name).toBe("[redacted]");
    expect(people?.profile_id).toBe("p1");
  });

  it("leaves an array of plain values alone", () => {
    const out = __testing.scrub({ roles: ["learner", "org_officer"] });
    expect(out.roles).toEqual(["learner", "org_officer"]);
  });
});
