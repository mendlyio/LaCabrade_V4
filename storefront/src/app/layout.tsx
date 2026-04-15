import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { preconnect, prefetchDNS } from "react-dom"
import "styles/globals.css"
import { Providers } from "@lib/context/providers"
import { GoogleConsentMode } from "@modules/common/components/google-analytics/consent-mode"
import OrganizationJsonLd from "@modules/common/components/json-ld/organization-jsonld"
import HtmlLangUpdater from "@modules/common/components/html-lang-updater"
import ClientOnlyOverlays from "@modules/layout/components/client-only-overlays"

const BASE_URL = getBaseURL()

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Sellerie Belgique | Sellerie équestre | La Cabrade · LC•EQUESTRIAN",
    template: "%s | La Cabrade",
  },
  description:
    "Sellerie Belgique et sellerie équestre : La Cabrade à Fléron. Équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques. Livraison rapide en Belgique et Europe.",
  icons: {
    icon: "https://ik.imagekit.io/kodt9cn6f/Cabrade/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "fr_BE",
    siteName: "La Cabrade",
    title: "Sellerie Belgique | Sellerie équestre | La Cabrade · LC•EQUESTRIAN",
    description:
      "Sellerie Belgique et sellerie équestre : La Cabrade à Fléron. Équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Sellerie Belgique | Sellerie équestre | La Cabrade",
    description:
      "Sellerie Belgique — équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques.",
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      "fr-BE": `${BASE_URL}/be`,
      "nl-BE": `${BASE_URL}/be`,
      "x-default": `${BASE_URL}/be`,
    },
  },
  keywords: [
    "sellerie belgique",
    "sellerie équestre",
    "zadelmakerij",
    "équipement cavalier",
    "paardrijuitrusting",
    "La Cabrade",
    "LC Equestrian",
    "Fléron",
    "Belgique",
    "België",
  ],
  verification: {
    google: "sTxBoYrcrYjBNX7cj-E5NCsVgUcFb8lHT9-nPItx7HM",
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  // Avertit le navigateur de pré-établir les connexions vers les CDN d'images
  // avant même que le HTML soit parsé — réduit la latence du LCP image.
  preconnect("https://ik.imagekit.io", { crossOrigin: "anonymous" })
  preconnect("https://bucket-production-de72.up.railway.app", { crossOrigin: "anonymous" })
  prefetchDNS("https://www.googletagmanager.com")
  prefetchDNS("https://connect.facebook.net")

  return (
    <html lang="fr-BE" data-mode="light">
      <body>
        <OrganizationJsonLd />
        <GoogleConsentMode />
        <Providers>
          <HtmlLangUpdater />
          <main className="relative">{props.children}</main>
          <ClientOnlyOverlays />
        </Providers>
      </body>
    </html>
  )
}
