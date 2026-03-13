import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Image optimization configuration.
   * Allows loading images from Supabase Storage.
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  /**
   * Security headers that apply to all routes.
   * Additional headers (CSP, Permissions-Policy) are handled by middleware.ts
   * to allow dynamic values based on environment variables.
   */
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ],

  /**
   * Opt out of telemetry.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
