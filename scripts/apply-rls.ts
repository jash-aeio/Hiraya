import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import postgres from "postgres";

import { requireEnv } from "./env";
import { isMain } from "./is-main";

/**
 * Applies every policy file in src/db/rls/ in filename order.
 *
 * Every file is idempotent (DROP POLICY IF EXISTS before CREATE POLICY, CREATE
 * OR REPLACE for functions), so this is safe to re-run and is re-run on every
 * migration. The alternative — folding policies into generated migration SQL —
 * buries security rules in diff artefacts nobody reads twice.
 */

const RLS_DIR = join(process.cwd(), "src", "db", "rls");

export async function applyRls(connectionString: string): Promise<string[]> {
  const files = (await readdir(RLS_DIR)).filter((f) => f.endsWith(".sql")).sort();

  if (files.length === 0) {
    throw new Error(`No RLS policy files found in ${RLS_DIR}. Refusing to leave tables unprotected.`);
  }

  const sql = postgres(connectionString, { max: 1, onnotice: () => {} });
  try {
    for (const file of files) {
      const text = await readFile(join(RLS_DIR, file), "utf8");
      await sql.unsafe(text);
      process.stdout.write(`  applied ${file}\n`);
    }
  } finally {
    await sql.end();
  }
  return files;
}

async function main(): Promise<void> {
  const url = process.env.RLS_TARGET_URL ?? requireEnv("DATABASE_URL");
  process.stdout.write("Applying RLS policies\n");
  const files = await applyRls(url);
  process.stdout.write(`RLS applied: ${files.length} files\n`);
}

if (isMain(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exit(1);
  });
}
