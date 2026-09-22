/**
 * Structured logging with the no-PII rule enforced rather than remembered
 * (CLAUDE.md R8).
 *
 * Log `profile_id`. Never a name, a section, an LRN, or an email — not here, not
 * to Sentry, not in an error message a learner reads. The rule is easy to hold
 * in mind on the day you write the line and easy to lose six months later, so
 * the denied keys are a list the code checks instead of a habit.
 */

const DENIED_KEYS = [
  "lrn",
  "lrn_hmac",
  "lrnhmac",
  "name",
  "display_name",
  "displayname",
  "full_name",
  "fullname",
  "first_name",
  "last_name",
  "section",
  "email",
  "password",
  "token",
  "push_token",
  "access_token",
];

export type LogFields = Record<string, unknown>;

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return scrub(value as LogFields);
  }
  return value;
}

function scrub(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (DENIED_KEYS.includes(key.toLowerCase())) {
      out[key] = "[redacted]";
      continue;
    }
    // Arrays are walked too, not skipped. The scrubber used to recurse into
    // plain objects only, so `{ people: [{ display_name: "..." }] }` went out
    // whole — the denied key was there, one level inside an array, and the
    // guard stepped over it. Nothing in the codebase logs that shape today,
    // which is exactly why it would have been found by shipping it.
    out[key] = scrubValue(value);
  }
  return out;
}

function emit(level: "info" | "warn" | "error", event: string, fields: LogFields): void {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...scrub(fields) });
  if (level === "error") {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

export const log = {
  info: (event: string, fields: LogFields = {}) => emit("info", event, fields),
  warn: (event: string, fields: LogFields = {}) => emit("warn", event, fields),
  error: (event: string, fields: LogFields = {}) => emit("error", event, fields),
} as const;

/** Exported for the unit test that proves the denied keys never survive. */
export const __testing = { scrub, DENIED_KEYS } as const;
