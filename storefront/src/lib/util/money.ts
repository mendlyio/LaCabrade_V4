import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

/**
 * Formate un montant monétaire pour l'affichage.
 * Medusa v2 store API renvoie les montants en centimes (plus petite unité).
 */
export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  locale = "fr-FR",
}: ConvertToLocaleParams) => {
  const value = Number(amount)
  if (!Number.isFinite(value)) return "—"
  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(value)
    : value.toFixed(2)
}

/**
 * Formate un montant en centimes vers l'affichage (euros).
 * Medusa stocke les montants en plus petite unité (centimes pour EUR).
 */
export const formatAmountFromCents = (
  amount: number | null | undefined,
  currencyCode: string,
  locale = "fr-FR"
): string => {
  const value = Number(amount ?? 0) / 100
  return convertToLocale({ amount: value, currency_code: currencyCode, locale })
}
