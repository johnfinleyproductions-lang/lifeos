import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  typedRoutes: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
