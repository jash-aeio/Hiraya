import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescriptRules from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "drizzle/**", "android/**", "ios/**", "coverage/**"] },
  ...coreWebVitals,
  ...typescriptRules,
  {
    rules: {
      // CLAUDE.md R2 — the service-role client bypasses RLS entirely, so exactly
      // one module may construct it. This rule is why that stays true: it fails
      // the build rather than relying on review to notice the import.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/db/admin", "@/lib/db/admin", "**/db/admin"],
              message:
                "The service-role client bypasses RLS. Use @/lib/db/client (anon key + RLS). If a call genuinely cannot work under RLS, add a reason to the allowlist in src/lib/db/admin.ts and add the calling file to the override at the bottom of eslint.config.mjs.",
            },
          ],
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      // A leading underscore marks a parameter kept for a signature that a later
      // phase fills in — see resolveSession in src/lib/auth/session.ts.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // The allowlist. Every entry needs a documented reason in
    // src/lib/db/admin.ts, and hiraya-tenancy-auditor checks the two agree.
    files: ["src/lib/db/admin.ts"],
    rules: { "no-restricted-imports": "off" },
  },
];

export default config;
