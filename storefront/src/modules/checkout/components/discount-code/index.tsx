"use client"

import { Badge, Input, Text } from "@medusajs/ui"
import React, { useEffect, useState } from "react"

import {
  applyPromotions,
  submitPromotionForm,
  applyGiftCardToCart,
  removeGiftCardFromCart,
} from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

const GC_CODE_PATTERN = /^LC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

type AppliedGiftCard = { code: string; balance: number }

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
  customer?: HttpTypes.StoreCustomer | null
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)

  const { promotions = [] } = cart
  const validPromotions = (promotions ?? []).filter(
    (p): p is NonNullable<typeof p> => p != null
  )

  // Regular promotions only (no gift cards in promotions anymore).
  // Hide automatic promotions that have no visible effect (e.g. FREE_SHIPPING_75
  // showing even when the cart doesn't meet the threshold).
  const regularPromotions = validPromotions.filter((p) => {
    if (p.code && GC_CODE_PATTERN.test(p.code)) return false
    if (p.is_automatic) {
      const hasItemAdjustment = (cart.items ?? []).some((item: any) =>
        (item.adjustments ?? []).some((adj: any) => adj.code === p.code)
      )
      const hasShippingAdjustment = (cart.shipping_methods ?? []).some(
        (sm: any) =>
          (sm.adjustments ?? []).some((adj: any) => adj.code === p.code)
      )
      if (!hasItemAdjustment && !hasShippingAdjustment) return false
    }
    return true
  })

  // Gift cards from cart metadata
  const appliedGiftCards: AppliedGiftCard[] =
    (cart.metadata as any)?.applied_gift_cards ?? []

  const removePromotionCode = async (code: string) => {
    const toApply = validPromotions.filter(
      (promotion) => promotion.code !== code
    )
    await applyPromotions(
      toApply.filter((p) => p.code != null).map((p) => p.code!)
    )
  }

  const removeGiftCard = async (code: string) => {
    try {
      await removeGiftCardFromCart(code)
      setPromoError(null)
    } catch (e: any) {
      setPromoError(e?.message ?? "Erreur lors du retrait du bon cadeau")
    }
  }

  const addPromotionCode = async (formData: FormData) => {
    const rawCode = formData.get("code")
    if (!rawCode || !rawCode.toString().trim()) return

    const code = rawCode.toString().toUpperCase().trim()
    const input = document.getElementById("promotion-input") as HTMLInputElement

    if (GC_CODE_PATTERN.test(code)) {
      try {
        await applyGiftCardToCart(code)
        setPromoError(null)
        if (input) input.value = ""
      } catch (e: any) {
        setPromoError(e?.message ?? "Bon cadeau invalide")
      }
      return
    }

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

      {/* Gift Card Codes (from cart metadata) */}
      {appliedGiftCards.length > 0 && (
        <div className="mt-3">
          {appliedGiftCards.map((gc) => (
            <div
              key={gc.code}
              className="flex items-center justify-between py-2"
              data-testid="gift-card-row"
            >
              <div className="flex flex-col gap-0.5">
                <Text className="flex items-center gap-2 text-sm">
                  <Badge color="purple" size="small">
                    {gc.code}
                  </Badge>
                  <span className="text-xs text-green-600 font-medium">
                    −{convertToLocale({ amount: gc.balance, currency_code: "eur" })}
                  </span>
                </Text>
                <span className="text-xs text-gray-500 ml-1">
                  Solde disponible :{" "}
                  <span className="font-medium text-amber-600">
                    {new Intl.NumberFormat("fr-BE", {
                      style: "currency",
                      currency: "EUR",
                    }).format(gc.balance)}
                  </span>
                </span>
              </div>
              <button
                className="text-gray-400 hover:text-red-500 transition-colors"
                onClick={() => removeGiftCard(gc.code)}
                data-testid="remove-gift-card-button"
              >
                <Trash size={14} />
                <span className="sr-only">Retirer</span>
              </button>
            </div>
          ))}
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
