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
    default: "Sellerie Liège | Sellerie en ligne Belgique | La Cabrade · LC•EQUESTRIAN",
    template: "%s | La Cabrade",
  },
  description:
    "Sellerie Liège et sellerie en ligne Belgique : La Cabrade à Fléron (Liège). Équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques. Livraison rapide Belgique & Europe.",
  icons: {
    icon: "https://ik.imagekit.io/kodt9cn6f/Cabrade/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "fr_BE",
    siteName: "La Cabrade",
    title: "Sellerie Liège | Sellerie en ligne Belgique | La Cabrade · LC•EQUESTRIAN",
    description:
      "Sellerie Liège et sellerie en ligne Belgique : La Cabrade à Fléron. Équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Sellerie Liège | Sellerie en ligne Belgique | La Cabrade",
    description:
      "Sellerie Liège & sellerie en ligne Belgique — équipement cavalier et cheval, cuirs artisanaux, LC Equestrian et grandes marques.",
  },
  // Pas de canonical global ici : l'apex (BASE_URL) redirige (307) et ne doit pas
  // servir de canonical. Chaque page définit son propre canonical auto-référencé
  // (accueil, catégories, produits, store…), ce qui évite la cannibalisation.
  keywords: [
    "sellerie liège",
    "sellerie en ligne belgique",
    "sellerie belgique",
    "sellerie équestre",
    "zadelmakerij",
    "équipement cavalier",
    "paardrijuitrusting",
    "La Cabrade",
    "LC Equestrian",
    "Fléron",
    "Liège",
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
