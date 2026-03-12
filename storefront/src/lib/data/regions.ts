import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { cache } from "react"
import { HttpTypes } from "@medusajs/types"

export const listRegions = cache(async function () {
  return sdk.store.region
    .list({}, { next: { tags: ["regions"] } })
    .then(({ regions }) => regions)
    .catch(medusaError)
})

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

export const getRegion = cache(async function (countryCode: string) {
  try {
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
