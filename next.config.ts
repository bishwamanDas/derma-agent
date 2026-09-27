import type { NextConfig } from "next";

/**
 * The Python inference API (backend/app.py) runs on port 8000. Proxying it
 * through Next keeps every browser request same-origin, so the app works
 * behind a reverse proxy / preview host without CORS or hardcoded hosts.
 */
const API_PORT = process.env.DERM_API_PORT ?? "8000";
const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, "") || `http://127.0.0.1:${API_PORT}`;

const nextConfig: NextConfig = {
  // Allow the sandbox live-preview host (and any e2b.app preview subdomain)
  // to load dev resources when running `next dev`.
  allowedDevOrigins: ["*.e2b.app"],
  async rewrites() {
    return [
      {
        source: "/api/ai/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
