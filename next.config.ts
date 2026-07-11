import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["tldraw"],
  experimental: {
    proxyClientMaxBodySize: 50 * 1024 * 1024, // 50MB
  },
};

export default nextConfig;
