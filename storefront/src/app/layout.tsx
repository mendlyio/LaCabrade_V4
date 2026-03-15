import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { Providers } from "@lib/context/providers"
import CookieBanner from "@modules/layout/components/cookie-banner"
import { GoogleConsentMode } from "@modules/common/components/google-analytics/consent-mode"
import NewsletterPopup from "@modules/layout/components/newsletter-popup"
import OrganizationJsonLd from "@modules/common/components/json-ld/organization-jsonld"

const BASE_URL = getBaseURL()

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "La Cabrade - Sellerie Équestre | LC•EQUESTRIAN",
    template: "%s | La Cabrade",
  },
  description:
    "Sellerie équestre La Cabrade : équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques. Livraison rapide en Belgique et Europe.",
  icons: {
    icon: "https://ik.imagekit.io/kodt9cn6f/Cabrade/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "fr_BE",
    siteName: "La Cabrade",
    title: "La Cabrade - Sellerie Équestre | LC•EQUESTRIAN",
    description:
      "Sellerie équestre La Cabrade : équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "La Cabrade - Sellerie Équestre",
    description:
      "Équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques.",
  },
  alternates: {
    canonical: BASE_URL,
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-mode="light">
      <body>
        <OrganizationJsonLd />
        <Providers>
          <GoogleConsentMode />
          <main className="relative">{props.children}</main>
          <CookieBanner />
          <NewsletterPopup />
        </Providers>
      </body>
    </html>
  )
}
