import { isEmpty } from "./isEmpty"

/**
 * Formate un montant pour l'affichage.
 * Medusa renvoie les montants en centimes (unité la plus petite) pour l'API store.
 * Si le montant est < 100, on suppose qu'il est déjà en unités (euros).
 */
export const formatAmountFromCents = (
  amountInCents: number | null | undefined,
  currencyCode: string,
  locale = "fr-FR"
): string => {
  const amount = Number(amountInCents)
  if (!Number.isFinite(amount)) return "—"
  // Montants Medusa en centimes (500 = 5€, 1290 = 12.90€) ; si < 100, déjà en euros
  const amountInUnits = amount >= 100 ? amount / 100 : amount
  return currencyCode && !isEmpty(currencyCode)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amountInUnits)
    : amountInUnits.toFixed(2)
}

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount)
    : amount.toString()
}
