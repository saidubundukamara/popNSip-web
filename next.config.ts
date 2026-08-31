import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this directory. Without it Turbopack walks up
  // past the repo looking for a lockfile, finds an unrelated one in the home
  // directory, and warns on every start.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
