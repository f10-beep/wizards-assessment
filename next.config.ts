import type { NextConfig } from "next";

// See ALLOWED_DEV_ORIGINS in .env.example — kept out of source so local
// LAN IPs don't end up committed.
const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  ...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
};

export default nextConfig;
