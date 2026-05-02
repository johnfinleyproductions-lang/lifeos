import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // typedRoutes is disabled because we redirect to EC's external /auth
  // route (cross-app SSO), and Next 16's typed redirect signature only
  // accepts internal Route types. Re-enable in Phase 10 if we move all
  // auth flow internal.
  typedRoutes: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
