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
