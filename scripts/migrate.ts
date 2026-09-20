import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { applyRls } from "./apply-rls";
import { requireEnv } from "./env";
import { isMain } from "./is-main";

/**
 * `db:migrate` is schema plus RLS, in that order, as one command.
 *
 * Splitting them would let a deploy create tables and stop — and a table that
 * exists without its policy is readable across tenants for as long as the gap
 * lasts. Both steps are idempotent, so re-running is always safe.
 */
export async function migrateAndProtect(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  } finally {
    await sql.end();
  }
  await applyRls(connectionString);
}

async function main(): Promise<void> {
  const url = requireEnv("DATABASE_URL");
  process.stdout.write("Running migrations\n");
  await migrateAndProtect(url);
  process.stdout.write("Migrations and RLS applied. Run `npm run db:verify-rls` to confirm.\n");
}

if (isMain(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
}
