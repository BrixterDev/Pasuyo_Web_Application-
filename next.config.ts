import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  experimental: {
    // Product forms accept up to five 5 MB image files.
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },
  images: supabaseUrl
    ? {
        remotePatterns: [
          new URL(`${supabaseUrl}/storage/v1/object/public/product-images/**`),
        ],
      }
    : undefined,
};

export default nextConfig;
