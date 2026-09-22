/**
 * The error taxonomy (docs/SYSTEM_DESIGN.md §8).
 *
 * Services throw these. Only `toHttpStatus` knows about HTTP, so a service can
 * be called from a route handler, a job, or a test without any of them having to
 * agree on status codes.
 *
 * Two entries here are deliberate product decisions rather than plumbing:
 *
 *   DUPLICATE_CHECKIN maps to 200. Scanning the same learner twice is not an
 *   error — the officer did nothing wrong, and a red screen at the gate teaches
 *   them to distrust the scanner.
 *
 *   NOT_FOUND is returned for a row in another school, with the same message as
 *   a row that does not exist. Distinguishing them would confirm that a given
 *   learner exists somewhere in the system.
 */

export const ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "CONSENT_REQUIRED",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "EVENT_FULL",
  "NOT_ELIGIBLE",
  "EVENT_NOT_APPROVED",
  "DUPLICATE_CHECKIN",
  "TOKEN_EXPIRED",
  "TOKEN_INVALID",
  "SCAN_OUTSIDE_EVENT_WINDOW",
  "IMPORT_ROW_INVALID",
  "RATE_LIMITED",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  CONSENT_REQUIRED: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  EVENT_FULL: 409,
  NOT_ELIGIBLE: 403,
  // Scanning for an event no adviser has approved. 403 rather than 404: the
  // officer can see the event - it is their own org's - they simply may not
  // turn it into attendance yet.
  EVENT_NOT_APPROVED: 403,
  DUPLICATE_CHECKIN: 200,
  TOKEN_EXPIRED: 422,
  TOKEN_INVALID: 422,
  SCAN_OUTSIDE_EVENT_WINDOW: 422,
  IMPORT_ROW_INVALID: 207,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/**
 * `details` is for machine-readable context: field paths, the criterion that
 * excluded a learner, a retry-after. It is serialized to the client, so it holds
 * ids and codes and never a name, a section, or an LRN (CLAUDE.md R8).
 */
export class HirayaError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? code);
    this.name = "HirayaError";
    this.code = code;
    if (details) this.details = details;
  }
}

export function isHirayaError(error: unknown): error is HirayaError {
  return error instanceof HirayaError;
}

export function toHttpStatus(code: ErrorCode): number {
  return HTTP_STATUS[code];
}

/** Convenience constructors for the codes thrown from more than one place. */
export const errors = {
  unauthenticated: () => new HirayaError("UNAUTHENTICATED"),
  forbidden: (requiredRole?: string) =>
    new HirayaError(
      "FORBIDDEN",
      requiredRole ? `Requires role: ${requiredRole}` : undefined,
      requiredRole ? { requiredRole } : undefined,
    ),
  consentRequired: () => new HirayaError("CONSENT_REQUIRED"),
  notFound: (resource?: string) =>
    new HirayaError("NOT_FOUND", undefined, resource ? { resource } : undefined),
  validationFailed: (details: Record<string, unknown>) =>
    new HirayaError("VALIDATION_FAILED", undefined, details),
  internal: (message?: string) => new HirayaError("INTERNAL", message),
} as const;
