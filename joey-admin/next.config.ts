import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Hides the compile/static-route indicator; full DevTools shell is suppressed via global CSS (`nextjs-portal`). */
  devIndicators: false,
};

export default nextConfig;
