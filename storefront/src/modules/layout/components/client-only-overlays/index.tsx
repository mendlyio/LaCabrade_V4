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

const BraderiePopup = dynamic(
  () => import("@modules/layout/components/braderie-popup"),
  { ssr: false }
)

export default function ClientOnlyOverlays() {
  return (
    <>
      <CookieBanner />
      <BraderiePopup />
      <NewsletterPopup />
    </>
  )
}
