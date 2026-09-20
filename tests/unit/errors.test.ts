import { describe, expect, it } from "vitest";

import { ERROR_CODES, HirayaError, errors, isHirayaError, toHttpStatus } from "@/lib/errors";

describe("error taxonomy", () => {
  it("maps every code to a status", () => {
    for (const code of ERROR_CODES) {
      expect(typeof toHttpStatus(code), code).toBe("number");
    }
  });

  it("treats a duplicate check-in as success", () => {
    // The officer scanned a learner who was already in. Nothing went wrong, and a
    // failure at the gate teaches officers to distrust the scanner.
    expect(toHttpStatus("DUPLICATE_CHECKIN")).toBe(200);
  });

  it("answers a missing row and another school's row identically", () => {
    // Distinguishing them would confirm that a learner exists somewhere in the
    // system, which is a cross-tenant disclosure in its own right.
    expect(toHttpStatus("NOT_FOUND")).toBe(404);
    expect(errors.notFound("event").message).toBe(errors.notFound("profile").message);
  });

  it("names the role a forbidden call needed", () => {
    const error = errors.forbidden("org_adviser");
    expect(error.details).toEqual({ requiredRole: "org_adviser" });
  });

  it("recognizes its own errors", () => {
    expect(isHirayaError(new HirayaError("INTERNAL"))).toBe(true);
    expect(isHirayaError(new Error("plain"))).toBe(false);
  });
});
