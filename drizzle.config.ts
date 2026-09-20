import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` is offline and needs no credentials; push, pull and
// studio do. Scripts that actually connect (scripts/migrate.ts) require the
// variable themselves, so a missing URL fails there with a useful message
// instead of blocking migration generation on a machine with no database.
const url = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  // RLS policies are hand-written SQL in src/db/rls/ and applied by
  // scripts/apply-rls.ts. They are deliberately not generated: a policy is a
  // security rule that must be read by a human, not a diff artefact.
  strict: true,
  verbose: true,
});
