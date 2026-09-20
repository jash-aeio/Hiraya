import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Capacitor shell ships a static bundle and calls the same /api/v1 as the
  // web app (CLAUDE.md R3). Nothing here may introduce a server-only data path.
  typedRoutes: true,
};

export default withNextIntl(nextConfig);
