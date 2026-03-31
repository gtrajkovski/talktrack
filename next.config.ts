import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Allow dev access from local network (phone testing)
  allowedDevOrigins: ["http://172.18.224.1:3001"],
};

export default withPWA(nextConfig);
