/**
 * Montants des bons cadeau La Cabrade.
 *
 * Dualité historique :
 *   - Produits Odoo : `unit_price` en euros (50 = 50 €)
 *   - Variants Medusa `is_giftcard` : prix catalogue en centimes (GC-050 = 5000)
 *
 * Un `custom_amount` saisi par le client est TOUJOURS en euros.
 * 5000 saisi dans le formulaire = 5000 €, donc rejeté (plafond 500 €).
 * 5000 lu depuis le catalogue GC-050 = 50,00 € (centimes).
 */

export const GIFT_CARD_MIN_EUROS = 10
export const GIFT_CARD_MAX_EUROS = 500
export const GIFT_CARD_PRODUCT_HANDLE = "bon-cadeau"

export const GIFT_CARD_SKU_FACE_VALUES: Record<string, number> = {
  "GC-025": 25,
  "GC-050": 50,
  "GC-100": 100,
}

export function parseGiftCardAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/\s/g, "").replace(",", ".")
    if (!trimmed) return null
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function roundEuros(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function isGiftCardAmountInRange(amount: number): boolean {
  return (
    Number.isFinite(amount) &&
    amount + 0.001 >= GIFT_CARD_MIN_EUROS &&
    amount - 0.001 <= GIFT_CARD_MAX_EUROS
  )
}

/**
 * Montant personnalisé envoyé par le client. Jamais de conversion centimes :
 * 5000 doit être rejeté, pas transformé en 50 €.
 */
export function validateCustomGiftCardAmount(value: unknown): {
  ok: boolean
  amount: number
  message: string
} {
  const parsed = parseGiftCardAmount(value)
  if (parsed == null) {
    return {
      ok: false,
      amount: 0,
      message: `Le montant personnalisé doit être un nombre entre ${GIFT_CARD_MIN_EUROS}€ et ${GIFT_CARD_MAX_EUROS}€`,
    }
  }
  const amount = roundEuros(parsed)
  if (amount < GIFT_CARD_MIN_EUROS) {
    return {
      ok: false,
      amount: 0,
      message: `Le montant personnalisé doit être d'au moins ${GIFT_CARD_MIN_EUROS}€`,
    }
  }
  if (amount > GIFT_CARD_MAX_EUROS) {
    return {
      ok: false,
      amount: 0,
      message: `Le montant personnalisé ne peut pas dépasser ${GIFT_CARD_MAX_EUROS}€`,
    }
  }
  return { ok: true, amount, message: "" }
}

/**
 * Prix catalogue / line item : peut être en euros ou en centimes Medusa.
 * Un SKU connu (GC-050) a toujours priorité.
 */
export function resolveGiftCardFaceValueEuros(input: {
  sku?: string | null
  title?: string | null
  unitPrice?: unknown
  metadataFaceValue?: unknown
}): number | null {
  const meta = parseGiftCardAmount(input.metadataFaceValue)
  if (meta != null && isGiftCardAmountInRange(meta)) {
    return roundEuros(meta)
  }

  const sku = String(input.sku || "").toUpperCase()
  if (GIFT_CARD_SKU_FACE_VALUES[sku]) {
    return GIFT_CARD_SKU_FACE_VALUES[sku]
  }

  const skuCustom = sku.match(/^GC-CUSTOM-(\d+(?:\.\d+)?)$/)
  if (skuCustom) {
    const fromSku = Number(skuCustom[1])
    if (isGiftCardAmountInRange(fromSku)) return roundEuros(fromSku)
  }

  const titleMatch = String(input.title || "").match(/(\d+[.,]?\d*)\s*€/)
  if (titleMatch) {
    const fromTitle = Number(titleMatch[1].replace(",", "."))
    if (isGiftCardAmountInRange(fromTitle)) return roundEuros(fromTitle)
  }

  const raw = parseGiftCardAmount(input.unitPrice)
  if (raw == null || raw <= 0) return null

  if (isGiftCardAmountInRange(raw)) {
    return roundEuros(raw)
  }

  // Catalogue Medusa (2500 / 5000 / 10000 centimes) ou unit_price non converti
  if (raw > GIFT_CARD_MAX_EUROS) {
    const asEuros = roundEuros(raw / 100)
    if (isGiftCardAmountInRange(asEuros)) return asEuros
  }

  return null
}

/** Corrige un solde déjà persisté si original_amount était en centimes (ex. 5000 → 50). */
export function normalizeStoredGiftCardAmounts(
  originalAmount: unknown,
  balance: unknown
): { original: number; balance: number; renormalized: boolean } {
  const rawOriginal = parseGiftCardAmount(originalAmount) ?? 0
  const rawBalance = parseGiftCardAmount(balance) ?? 0
  const normalizedOriginal =
    resolveGiftCardFaceValueEuros({ unitPrice: rawOriginal }) ?? rawOriginal
  if (rawOriginal > 0 && Math.abs(rawOriginal - normalizedOriginal) > 0.01) {
    const ratio = normalizedOriginal / rawOriginal
    return {
      original: normalizedOriginal,
      balance: Math.round(rawBalance * ratio * 100) / 100,
      renormalized: true,
    }
  }
  return { original: rawOriginal, balance: rawBalance, renormalized: false }
}

export function giftCardMetadata(
  base: Record<string, unknown>,
  faceValueEuros: number
): Record<string, unknown> {
  return {
    ...base,
    is_gift_card: true,
    face_value_euros: faceValueEuros,
  }
}
