import { afterEach, describe, expect, it } from "vitest";

import { DEMO_SCHOOLS_ENV, allowedDemoSchoolSlugs, isAllowedDemoSchool } from "@/lib/auth/demo-allowlist";

/**
 * The deployment half of the demo gate (D23).
 *
 * The database half is tested in tests/integration/demo-session.test.ts against
 * a real Postgres. This half has one job worth stating plainly: when nobody has
 * configured it, it permits nothing. A gate that defaults to open is a gate that
 * leaks on the first deployment somebody forgets.
 */

const original = process.env[DEMO_SCHOOLS_ENV];

afterEach(() => {
  if (original === undefined) delete process.env[DEMO_SCHOOLS_ENV];
  else process.env[DEMO_SCHOOLS_ENV] = original;
});

describe("the demo school allowlist", () => {
  it("permits nothing when unset", () => {
    delete process.env[DEMO_SCHOOLS_ENV];
    expect(allowedDemoSchoolSlugs().size).toBe(0);
    expect(isAllowedDemoSchool("halimbawa-demo")).toBe(false);
  });

  it("permits nothing when set to an empty or whitespace value", () => {
    for (const value of ["", "   ", ",", " , ,"]) {
      process.env[DEMO_SCHOOLS_ENV] = value;
      expect(isAllowedDemoSchool("halimbawa-demo")).toBe(false);
    }
  });

  it("permits exactly the schools named", () => {
    process.env[DEMO_SCHOOLS_ENV] = "halimbawa-demo";
    expect(isAllowedDemoSchool("halimbawa-demo")).toBe(true);
    // A real tenant is not admitted by the database flag alone.
    expect(isAllowedDemoSchool("some-real-school")).toBe(false);
  });

  it("reads a list, tolerating the spacing a human will type", () => {
    process.env[DEMO_SCHOOLS_ENV] = " halimbawa-demo , second-demo ";
    expect(allowedDemoSchoolSlugs()).toEqual(new Set(["halimbawa-demo", "second-demo"]));
  });

  it("compares case-insensitively, because a slug in config is typed by hand", () => {
    process.env[DEMO_SCHOOLS_ENV] = "Halimbawa-Demo";
    expect(isAllowedDemoSchool("halimbawa-demo")).toBe(true);
  });

  it("does not match on a prefix or a substring", () => {
    process.env[DEMO_SCHOOLS_ENV] = "halimbawa-demo";
    expect(isAllowedDemoSchool("halimbawa-demo-2")).toBe(false);
    expect(isAllowedDemoSchool("halimbawa")).toBe(false);
  });
});
