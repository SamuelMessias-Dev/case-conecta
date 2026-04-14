import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.1.8', 'localhost', '192.168.1.8:3000', 'localhost:3000'],
} as any;

export default nextConfig;
