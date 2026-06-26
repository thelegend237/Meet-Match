import type { NextConfig } from "next";
import { MAX_PROFILE_PHOTO_MB } from "./src/lib/photos/limits";

/** Marge multipart au-dessus de la limite fichier (Mo). */
const UPLOAD_BODY_LIMIT_MB = MAX_PROFILE_PHOTO_MB + 5;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: `${UPLOAD_BODY_LIMIT_MB}mb`,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
