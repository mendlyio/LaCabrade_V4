const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // Local dev
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "localhost" },

      // Base URL (si défini) - utile si vous servez des images depuis votre propre domaine
      ...(process.env.NEXT_PUBLIC_BASE_URL
        ? [
            {
              protocol: process.env.NEXT_PUBLIC_BASE_URL.startsWith("https")
                ? "https"
                : "http",
              hostname: process.env.NEXT_PUBLIC_BASE_URL.replace(
                /^https?:\/\//,
                ""
              ),
            },
          ]
        : []),

      // Backend Medusa (si défini) - utile si certaines images viennent du backend
      ...(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
        ? [
            {
              protocol: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL.startsWith(
                "https"
              )
                ? "https"
                : "http",
              hostname: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL.replace(
                /^https?:\/\//,
                ""
              ),
            },
          ]
        : []),
      { // Note: can be removed after deleting demo products
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      { // Note: can be removed after deleting demo products
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      { // Note: can be removed after deleting demo products
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      // Bucket Railway (MinIO/S3 compatible) - utilisé par vos images produit
      {
        protocol: "https",
        hostname: "bucket-production-de72.up.railway.app",
      },

      // Endpoint MinIO custom (si défini)
      ...(process.env.NEXT_PUBLIC_MINIO_ENDPOINT
        ? [
            {
              protocol: "https",
              hostname: process.env.NEXT_PUBLIC_MINIO_ENDPOINT.replace(
                /^https?:\/\//,
                ""
              ),
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
