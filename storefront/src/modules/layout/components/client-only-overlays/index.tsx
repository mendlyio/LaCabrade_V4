"use client"

import dynamic from "next/dynamic"

const CookieBanner = dynamic(
  () => import("@modules/layout/components/cookie-banner"),
  { ssr: false }
)

const NewsletterPopup = dynamic(
  () => import("@modules/layout/components/newsletter-popup"),
  { ssr: false }
)

export default function ClientOnlyOverlays() {
  return (
    <>
      <CookieBanner />
      <NewsletterPopup />
    </>
  )
}
