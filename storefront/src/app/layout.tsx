import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { Providers } from "@lib/context/providers"
import CookieBanner from "@modules/layout/components/cookie-banner"
import { GoogleConsentMode } from "@modules/common/components/google-analytics/consent-mode"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  icons: {
    icon: "https://ik.imagekit.io/kodt9cn6f/Cabrade/favicon.ico",
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <Providers>
          <GoogleConsentMode />
          <main className="relative">{props.children}</main>
          <CookieBanner />
        </Providers>
      </body>
    </html>
  )
}
