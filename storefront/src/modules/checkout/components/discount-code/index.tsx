"use client"

import { Badge, Input, Text } from "@medusajs/ui"
import React, { useEffect, useState } from "react"

import { applyPromotions, submitPromotionForm } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const GC_CODE_PATTERN = /^LC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

type GiftCardBalance = {
  code: string
  original_amount: number
  balance: number
  status: string
}

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
  customer?: HttpTypes.StoreCustomer | null
}

async function fetchGiftCardBalance(
  code: string
): Promise<GiftCardBalance | null> {
  try {
    const headers: Record<string, string> = {}
    if (PUBLISHABLE_KEY) {
      headers["x-publishable-api-key"] = PUBLISHABLE_KEY
    }
    const res = await fetch(
      `${BACKEND_URL}/store/custom/gift-card-balance?code=${encodeURIComponent(code)}`,
      { headers }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.gift_card ?? null
  } catch {
    return null
  }
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [gcBalances, setGcBalances] = useState<Record<string, GiftCardBalance>>(
    {}
  )

  const { promotions = [] } = cart
  const validPromotions = (promotions ?? []).filter(
    (p): p is NonNullable<typeof p> => p != null
  )

  const gcPromotions = validPromotions.filter(
    (p) => p.code && GC_CODE_PATTERN.test(p.code)
  )
  const regularPromotions = validPromotions.filter(
    (p) => !p.code || !GC_CODE_PATTERN.test(p.code)
  )

  useEffect(() => {
    const codes = gcPromotions
      .map((p) => p.code!)
      .filter((c) => !gcBalances[c])
    if (codes.length === 0) return
    codes.forEach(async (code) => {
      const balance = await fetchGiftCardBalance(code)
      if (balance) {
        setGcBalances((prev) => ({ ...prev, [code]: balance }))
      }
    })
  }, [gcPromotions.map((p) => p.code).join(",")])

  const removePromotionCode = async (code: string) => {
    const toApply = validPromotions.filter(
      (promotion) => promotion.code !== code
    )
    await applyPromotions(
      toApply.filter((p) => p.code != null).map((p) => p.code!)
    )
    setGcBalances((prev) => {
      const next = { ...prev }
      delete next[code]
      return next
    })
  }

  const addPromotionCode = async (formData: FormData) => {
    const rawCode = formData.get("code")
    if (!rawCode || !rawCode.toString().trim()) return
    const input = document.getElementById(
      "promotion-input"
    ) as HTMLInputElement
    // submitPromotionForm retourne le message d'erreur ou undefined (succès)
    // Il ne throw jamais → pas de crash page Next.js App Router
    const error = await submitPromotionForm(null, formData)
    if (error) {
      setPromoError(error)
    } else {
      setPromoError(null)
      if (input) input.value = ""
    }
  }

  return (
    <div className="w-full flex flex-col">
      <form action={(a) => addPromotionCode(a)} className="w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1.5"
          data-testid="add-discount-button"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          {isOpen ? "Masquer" : "Ajouter un code promo ou bon cadeau"}
        </button>

        {isOpen && (
          <div className="mt-3 flex w-full gap-x-2">
            <Input
              className="flex-1"
              id="promotion-input"
              name="code"
              type="text"
              autoFocus={false}
              placeholder="Code promo ou bon cadeau"
              data-testid="discount-input"
            />
            <SubmitButton
              variant="secondary"
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors px-4"
              data-testid="discount-apply-button"
            >
              OK
            </SubmitButton>
          </div>
        )}

        {isOpen && (
          <ErrorMessage
            error={promoError}
            data-testid="discount-error-message"
          />
        )}
      </form>

      {/* Gift Card Codes */}
      {gcPromotions.length > 0 && (
        <div className="mt-3">
          {gcPromotions.map((promotion) => {
            const balance = promotion.code
              ? gcBalances[promotion.code]
              : null
            return (
              <div
                key={promotion.id}
                className="flex items-center justify-between py-2"
                data-testid="gift-card-row"
              >
                <div className="flex flex-col gap-0.5">
                  <Text className="flex items-center gap-2 text-sm">
                    <Badge color="purple" size="small">
                      {promotion.code ?? "Bon cadeau"}
                    </Badge>
                    {promotion.application_method?.value !== undefined &&
                      promotion.application_method.currency_code !==
                        undefined && (
                        <span className="text-xs text-green-600 font-medium">
                          −
                          {convertToLocale({
                            amount: Number(promotion.application_method.value),
                            currency_code:
                              promotion.application_method.currency_code,
                          })}
                        </span>
                      )}
                  </Text>
                  {balance && (
                    <span className="text-xs text-gray-500 ml-1">
                      Solde restant :{" "}
                      <span className="font-medium text-amber-600">
                        {new Intl.NumberFormat("fr-BE", {
                          style: "currency",
                          currency: "EUR",
                        }).format(balance.balance)}
                      </span>
                    </span>
                  )}
                </div>
                {!promotion.is_automatic && (
                  <button
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    onClick={() => {
                      if (promotion.code) removePromotionCode(promotion.code)
                    }}
                    data-testid="remove-gift-card-button"
                  >
                    <Trash size={14} />
                    <span className="sr-only">Retirer</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Regular Promotions */}
      {regularPromotions.length > 0 && (
        <div className="mt-3">
          {regularPromotions.map((promotion) => (
            <div
              key={promotion.id}
              className="flex items-center justify-between py-2"
              data-testid="discount-row"
            >
              <Text className="flex items-center gap-2 text-sm">
                <Badge
                  color={promotion.is_automatic ? "green" : "grey"}
                  size="small"
                >
                  {promotion.code ?? "Promo"}
                </Badge>
                {promotion.application_method?.value !== undefined &&
                  promotion.application_method.currency_code !== undefined && (
                    <span className="text-xs text-gray-500">
                      {promotion.application_method.type === "percentage"
                        ? `−${promotion.application_method.value}%`
                        : `−${convertToLocale({
                            amount: Number(promotion.application_method.value),
                            currency_code:
                              promotion.application_method.currency_code,
                          })}`}
                    </span>
                  )}
              </Text>
              {!promotion.is_automatic && (
                <button
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  onClick={() => {
                    if (promotion.code) removePromotionCode(promotion.code)
                  }}
                  data-testid="remove-discount-button"
                >
                  <Trash size={14} />
                  <span className="sr-only">Retirer</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DiscountCode
