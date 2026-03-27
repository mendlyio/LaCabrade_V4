const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Inline le CSS critique (au-dessus de la ligne de flottaison) et diffère le reste.
    // Réduit directement le warning PageSpeed "unused CSS rules".
    optimizeCss: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // AVIF en priorité (meilleure compression que WebP), puis WebP — réduit le poids vs WebP seul.
    formats: ["image/avif", "image/webp"],
    // Valeurs autorisées pour la prop `quality` sur <Image /> (Next.js 16+ exigera une liste explicite).
    qualities: [75, 70, 65, 60, 55, 50],
    // Cache les images optimisées 30 jours côté serveur (défaut : 60 s) — réduit la charge backend.
    minimumCacheTTL: 2592000,
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
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
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
