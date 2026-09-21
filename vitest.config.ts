import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // The integration suite talks to a real Postgres and applies migrations.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // RLS tests share one database; running files in parallel would let one
    // suite's fixtures appear inside another's tenant assertions.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Services and session plumbing are all `server-only`, which throws when
      // imported outside a Server Component. See tests/stubs/server-only.ts.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
});
