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
 * Medusa v2 store API renvoie les montants directement en unités d'affichage (euros),
 * sans conversion nécessaire.
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
 * Alias de convertToLocale — maintenu pour compatibilité.
 * Les montants Medusa v2 sont déjà en euros dans l'API store, aucune division nécessaire.
 */
export const formatAmountFromCents = (
  amount: number | null | undefined,
  currencyCode: string,
  locale = "fr-FR"
): string => {
  return convertToLocale({ amount: Number(amount ?? 0), currency_code: currencyCode, locale })
}
