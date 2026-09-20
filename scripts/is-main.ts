import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * True when this module is the file node/tsx was asked to run.
 *
 * Scripts here are both CLI entry points and importable helpers (the
 * integration suite applies migrations and RLS the same way `db:migrate` does,
 * so the two can never drift). Comparing resolved file URLs is the only check
 * that behaves the same on Windows and on CI's Linux runners.
 */
export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return moduleUrl === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}
