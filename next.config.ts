import type { NextConfig } from "next";

// proxy backend api requests
const API_PORT = process.env.DERM_API_PORT ?? "8000";
const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, "") || `http://127.0.0.1:${API_PORT}`;

const nextConfig: NextConfig = {
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
