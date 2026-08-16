import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@fontsource-variable/inter"],
  allowedDevOrigins: [".monkeycode-ai.live"],
};

export default nextConfig;
