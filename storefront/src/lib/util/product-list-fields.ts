import { HttpTypes } from "@medusajs/types"

/**
 * Exclusions listes boutique. slimListedProduct jette déjà ces champs :
 * les demander au backend gonfle heap (OOM 18/09) sans changer l'UI.
 */
export const PRODUCT_LIST_OMIT_FIELDS = ["-description", "-subtitle"] as const

export function productListCacheQuery(
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
): string {
  // `fields` reste dans la clé : metadata / catégories / images sont
  // demandés par les pages marques (filtre) et doivent rester distincts
  // d'un fetch minimal. On n'unifie que l'exclusion description/subtitle.
  return JSON.stringify(queryParams ?? {})
}

export function productListRequestFields(
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
): string {
  const caller =
    typeof queryParams?.fields === "string" && queryParams.fields.trim()
      ? queryParams.fields
      : "*variants.calculated_price,+variants.prices"
  const requested = caller.split(",").map((part) => part.trim())
  const extras = PRODUCT_LIST_OMIT_FIELDS.filter((field) => !requested.includes(field))
  return extras.length ? `${caller},${extras.join(",")}` : caller
}
