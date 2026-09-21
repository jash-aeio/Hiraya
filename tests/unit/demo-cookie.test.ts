import { describe, expect, it } from "vitest";

import { DEMO_SESSION_COOKIE, readDemoPersonaId } from "@/lib/auth/demo-session";

/**
 * The cookie parser behind the demo session (D23).
 *
 * It is small, and it is the first thing an untrusted request touches: whatever
 * comes out of here is handed to `public.demo_session_claims` as a uuid. The
 * database gate would still refuse a bad persona, but a parser that returns
 * something shaped wrong turns a refusal into an error, and errors on the
 * unauthenticated path are what attackers read.
 *
 * The integration suite covers the gate itself against a real Postgres; this
 * covers the string handling, which needs no database at all.
 */

function request(cookie?: string): Request {
  return new Request("https://hiraya.test/", {
    headers: cookie === undefined ? {} : { cookie },
  });
}

const PERSONA = "0a5b8e1c-2d3f-4a5b-8c7d-9e0f1a2b3c4d";

describe("readDemoPersonaId", () => {
  it("returns null when the request carries no cookies at all", () => {
    expect(readDemoPersonaId(request())).toBeNull();
  });

  it("reads the persona id", () => {
    expect(readDemoPersonaId(request(`${DEMO_SESSION_COOKIE}=${PERSONA}`))).toBe(PERSONA);
  });

  it("finds it among other cookies, in any position", () => {
    const first = `${DEMO_SESSION_COOKIE}=${PERSONA}; HIRAYA_LOCALE=fil`;
    const last = `HIRAYA_LOCALE=fil; other=1; ${DEMO_SESSION_COOKIE}=${PERSONA}`;
    expect(readDemoPersonaId(request(first))).toBe(PERSONA);
    expect(readDemoPersonaId(request(last))).toBe(PERSONA);
  });

  it("refuses a value that is not a uuid", () => {
    // What this keeps out of a query argument, rather than what it lets in.
    for (const value of ["", "not-a-uuid", "1 OR 1=1", `'${PERSONA}'`, `${PERSONA}x`]) {
      expect(readDemoPersonaId(request(`${DEMO_SESSION_COOKIE}=${value}`))).toBeNull();
    }
  });

  it("tolerates the whitespace a cookie header may carry", () => {
    // Trimmed and then validated, in that order: the trim is tolerance, the
    // uuid check is the guarantee.
    expect(readDemoPersonaId(request(`${DEMO_SESSION_COOKIE}= ${PERSONA} `))).toBe(PERSONA);
  });

  it("does not match a cookie whose name merely ends with ours", () => {
    // `X_HIRAYA_DEMO_PERSONA` is a different cookie, and a suffix match here
    // would let any origin that can set one choose the persona.
    const spoofed = `X_${DEMO_SESSION_COOKIE}=${PERSONA}`;
    expect(readDemoPersonaId(request(spoofed))).toBeNull();
  });

  it("ignores a malformed cookie header rather than throwing", () => {
    // A 500 on the unauthenticated path is information; a null is not.
    expect(readDemoPersonaId(request("; ;; =; noequals"))).toBeNull();
    expect(readDemoPersonaId(request(`${DEMO_SESSION_COOKIE}`))).toBeNull();
  });
});
