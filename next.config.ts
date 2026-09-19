import type { NextConfig } from "next";

// Server-only. Read here rather than imported from lib/api-origin.ts because
// the config is loaded outside the app's module graph.
const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Pin the workspace root to this directory. Without it Turbopack walks up
  // past the repo looking for a lockfile, finds an unrelated one in the home
  // directory, and warns on every start.
  turbopack: {
    root: import.meta.dirname,
  },

  // The browser only ever talks to this origin; /api/* is forwarded to
  // Express. In production the web app (Vercel) and the API (Railway) are on
  // unrelated domains, and the staff session cookie only survives if it is
  // first-party here. Dev goes through the same path so it behaves the same.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
