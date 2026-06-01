import { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account/",
          "/checkout/",
          "/order/",
          "/cart/",
          "/wishlist",
          "/search",
          "/results/",
          "/reset-password",
          "/commandes",
          "/_next/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
