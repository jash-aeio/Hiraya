import { config } from "dotenv";

/**
 * Scripts load environment the way Next.js does: `.env.local` wins, `.env` is
 * the fallback. Imported for its side effect by every script in this folder so
 * that a missing variable fails at the top of the run, not halfway through a
 * migration.
 */
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in before running this script.`,
    );
  }
  return value;
}

/**
 * The integration suite must never run against a database that could hold real
 * learner data. Before Gate B there is no such database and after it there will
 * be — so the guard is written now, while it costs nothing.
 */
export function assertDisposableDatabase(url: string): void {
  if (url === process.env.DATABASE_URL && process.env.ALLOW_DESTRUCTIVE_TESTS !== "1") {
    throw new Error(
      "TEST_DATABASE_URL equals DATABASE_URL. The integration suite writes fixtures and " +
        "toggles RLS; point it at a throwaway database, or set ALLOW_DESTRUCTIVE_TESTS=1 " +
        "if this one already is.",
    );
  }
}
