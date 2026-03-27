import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { cache } from "react"
import { unstable_cache } from "next/cache"
import { HttpTypes } from "@medusajs/types"

const _cachedListRegions = unstable_cache(
  async () =>
    sdk.store.region
      .list({}, { next: { tags: ["regions"] } })
      .then(({ regions }) => regions)
      .catch(medusaError),
  ["list-regions"],
  { revalidate: 3600, tags: ["regions"] }
)

export const listRegions = cache(_cachedListRegions)

export const retrieveRegion = cache(async function (id: string) {
  return sdk.store.region
    .retrieve(id, {}, { next: { tags: ["regions"] } })
    .then(({ region }) => region)
    .catch(medusaError)
})

const regionMap = new Map<string, HttpTypes.StoreRegion>()

/** Région de repli quand le backend est indisponible (502, timeout, etc.) */
const FALLBACK_REGION: HttpTypes.StoreRegion = {
  id: "reg_fallback",
  name: "Europe",
  currency_code: "eur",
  countries: [
    { iso_2: "fr", name: "France" },
    { iso_2: "be", name: "Belgique" },
  ] as any,
} as HttpTypes.StoreRegion

/** Liste de régions de repli pour la Nav quand le backend est indisponible */
export const FALLBACK_REGIONS: HttpTypes.StoreRegion[] = [FALLBACK_REGION]

const INVALID_COUNTRY_CODES = ["api", "admin", "static", "favicon", "_next"]

export const getRegion = cache(async function (countryCode: string) {
  try {
    if (!countryCode || INVALID_COUNTRY_CODES.includes(countryCode.toLowerCase())) {
      return null
    }
    if (regionMap.has(countryCode)) {
      return regionMap.get(countryCode)
    }

    const regions = await listRegions()

    if (!regions) {
      // Backend indisponible : utiliser la région de repli pour fr/be
      if (["fr", "be"].includes(countryCode?.toLowerCase() || "")) {
        return FALLBACK_REGION
      }
      return null
    }

    regions.forEach((region) => {
      region.countries?.forEach((c) => {
        regionMap.set(c?.iso_2 ?? "", region)
      })
    })

    const region = countryCode
      ? regionMap.get(countryCode)
      : regionMap.get("us")

    return region ?? (["fr", "be"].includes(countryCode?.toLowerCase() || "") ? FALLBACK_REGION : null)
  } catch (e: any) {
    // Backend down (502, timeout) : fallback pour fr/be
    if (["fr", "be"].includes(countryCode?.toLowerCase() || "")) {
      return FALLBACK_REGION
    }
    return null
  }
})
