import { describe, expect, it } from "vitest";

import en from "@/i18n/messages/en.json";
import fil from "@/i18n/messages/fil.json";

/**
 * The two catalogues hold the same keys (CLAUDE.md §4, DESIGN_SYSTEM.md §8).
 *
 * Added with the bottom nav (P-15), which is the first thing whose *accessible
 * names* come entirely from the catalogue: every tab's label is its link text,
 * so a key missing from `fil.json` does not render English, it renders the key
 * path — and a screen reader announces that. §8 requires every control labelled
 * in both locales, and until now nothing enforced it.
 *
 * Keys only. Whether a translation is *good* is not something a test can say;
 * whether it is *present* is exactly what a test should.
 */

type Catalogue = Record<string, unknown>;

function flatten(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Catalogue).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

const enKeys = flatten(en).sort();
const filKeys = flatten(fil).sort();

describe("i18n catalogues", () => {
  it("define exactly the same keys in both locales", () => {
    expect(filKeys).toEqual(enKeys);
  });

  it("has no empty string anywhere", () => {
    // An empty value passes a key-parity check and still renders nothing, which
    // on a nav tab means an unlabelled link.
    const empties: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === "string") {
        if (value.trim() === "") empties.push(path);
        return;
      }
      if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value as Catalogue)) {
          walk(v, path ? `${path}.${k}` : k);
        }
      }
    };
    walk(en, "");
    walk(fil, "");
    expect(empties).toEqual([]);
  });

  it("covers every navigation label the bottom bar reads", () => {
    for (const key of ["label", "home", "events", "leaderboard", "xp", "scan"]) {
      expect(enKeys).toContain(`navigation.${key}`);
      expect(filKeys).toContain(`navigation.${key}`);
    }
  });
});
