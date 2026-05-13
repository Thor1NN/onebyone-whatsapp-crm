import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "whatsapp-web.js",
    "puppeteer",
    "bullmq",
    "ioredis",
    "node-telegram-bot-api",
  ],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
