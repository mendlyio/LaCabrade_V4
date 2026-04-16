import { Metadata } from "next"

import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import { getBaseURL } from "@lib/util/env"
import { refreshAuthToken } from "@lib/data/auth-refresh"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  // Rafraîchir silencieusement le JWT à chaque navigation pour maintenir la session active
  refreshAuthToken().catch(() => null)

  return (
    <>
      <Nav />
      {props.children}
      <Footer />
    </>
  )
}
