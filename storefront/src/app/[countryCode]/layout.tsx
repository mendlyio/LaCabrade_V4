import { getRegion } from "@lib/data/regions"
import { redirect } from "next/navigation"

const INVALID_COUNTRY_CODES = ["api", "admin", "static", "favicon", "_next"]
const DEFAULT_COUNTRY = "fr"

export default async function CountryCodeLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  if (!countryCode || INVALID_COUNTRY_CODES.includes(countryCode.toLowerCase())) {
    redirect(`/${DEFAULT_COUNTRY}`)
  }

  const region = await getRegion(countryCode)
  if (!region) {
    redirect(`/${DEFAULT_COUNTRY}`)
  }

  return <>{children}</>
}
