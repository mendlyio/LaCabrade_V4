/**
 * Matching des variantes Odoo → Medusa lors de la re-sync.
 *
 * La sync existante identifie une variante par SKU. Si le SKU n'est pas
 * chargé (select trop étroit) ou a changé côté Odoo, l'upsert tente de
 * CRÉER une variante dont la combinaison d'options existe déjà →
 * "Variant (NOIR) with provided options already exists".
 *
 * Ce helper ne change pas la logique métier : il retrouve la variante
 * déjà présente (id, odoo_variant_id, SKU, puis options) avant l'upsert.
 */

export type IncomingOdooVariant = {
  id?: string
  sku?: string
  title?: string
  options?: Record<string, string>
  metadata?: {
    odoo_variant_id?: unknown
    external_id?: unknown
  }
}

export function optionSignature(options: Record<string, string> | undefined): string {
  if (!options) return ""
  return Object.entries(options)
    .filter(([, value]) => value != null && String(value).length > 0)
    .map(([key, value]) => `${key}:${value}`)
    .sort()
    .join("|")
}

export function extractVariantOptions(variant: any): Record<string, string> {
  if (!variant) return {}

  if (variant.options && !Array.isArray(variant.options) && typeof variant.options === "object") {
    const map: Record<string, string> = {}
    for (const [key, value] of Object.entries(variant.options)) {
      if (value != null && String(value).length > 0) map[key] = String(value)
    }
    return map
  }

  if (!Array.isArray(variant.options)) return {}

  const map: Record<string, string> = {}
  for (const opt of variant.options) {
    const title =
      opt?.option?.title ||
      opt?.option_title ||
      opt?.title ||
      null
    const value = opt?.value
    if (title && value != null && String(value).length > 0) {
      map[String(title)] = String(value)
    }
  }
  return map
}

function incomingOdooId(incoming: IncomingOdooVariant): string | null {
  const raw = incoming.metadata?.odoo_variant_id ?? incoming.metadata?.external_id
  if (raw == null) return null
  return String(raw)
}

function existingOdooId(variant: any): string | null {
  const raw = variant?.metadata?.odoo_variant_id ?? variant?.metadata?.external_id
  if (raw == null) return null
  return String(raw)
}

export function findExistingVariant(
  existingVariants: any[] | undefined,
  incoming: IncomingOdooVariant
): any | undefined {
  if (!existingVariants?.length) return undefined

  if (incoming.id) {
    const byId = existingVariants.find((v) => v?.id === incoming.id)
    if (byId) return byId
  }

  const odooId = incomingOdooId(incoming)
  if (odooId) {
    const byOdoo = existingVariants.find((v) => existingOdooId(v) === odooId)
    if (byOdoo) return byOdoo
  }

  if (incoming.sku) {
    const bySku = existingVariants.find((v) => v?.sku && v.sku === incoming.sku)
    if (bySku) return bySku
  }

  const incomingSig = optionSignature(incoming.options)
  if (incomingSig) {
    const byOptions = existingVariants.find(
      (v) => optionSignature(extractVariantOptions(v)) === incomingSig
    )
    if (byOptions) return byOptions
  }

  return undefined
}

/**
 * Complète les options manquantes depuis la variante Medusa déjà en base.
 * Retourne null si le produit exige N options et qu'on n'en a toujours pas assez
 * (cas SHETLA : 2 options produit, 1 valeur Odoo, pas de variante existante).
 */
export function completeVariantOptions(
  incomingOptions: Record<string, string> | undefined,
  requiredTitles: string[],
  existingVariant?: any
): Record<string, string> | null {
  const options = { ...(incomingOptions || {}) }
  const fromExisting = extractVariantOptions(existingVariant)

  for (const title of requiredTitles) {
    if (!options[title] && fromExisting[title]) {
      options[title] = fromExisting[title]
    }
  }

  if (!requiredTitles.length) return options

  const missing = requiredTitles.filter((title) => !options[title])
  if (missing.length) return null
  return options
}

export function isVariantCollisionError(message: unknown): boolean {
  const text = typeof message === "string" ? message : ""
  return (
    text.includes("with provided options already exists") ||
    text.includes("option values but there were") ||
    text.includes("already exists")
  )
}
