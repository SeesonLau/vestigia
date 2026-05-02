// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  //Pin the workspace root to web/ so Turbopack ignores the parent
  //repo's mobile app lockfile.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
