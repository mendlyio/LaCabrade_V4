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
 * Formate un montant pour l'affichage.
 * Les produits Odoo et totaux panier sont en EUROS.
 * Utiliser formatAmountFromCents uniquement pour les montants en centimes (ex: bon cadeau).
 */
export const formatAmount = (
  amount: number | null | undefined,
  currencyCode: string,
  locale = "fr-FR"
): string => {
  return convertToLocale({ amount: Number(amount ?? 0), currency_code: currencyCode, locale })
}

/** Pour les montants stockés en centimes (ex: bon cadeau custom). */
export const formatAmountFromCents = (
  amount: number | null | undefined,
  currencyCode: string,
  locale = "fr-FR"
): string => {
  const value = Number(amount ?? 0) / 100
  return convertToLocale({ amount: value, currency_code: currencyCode, locale })
}
