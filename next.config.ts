import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Every client reaches data through /api/v1 and nothing else (CLAUDE.md R3).
  // Nothing here may introduce a second, server-only data path.
  typedRoutes: true,
};

export default withNextIntl(nextConfig);
