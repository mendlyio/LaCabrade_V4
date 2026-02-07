"use client"

import { Badge, Heading, Input, Label, Text } from "@medusajs/ui"
import React from "react"
import { useFormState } from "react-dom"

import { applyPromotions, submitPromotionForm } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
  customer?: HttpTypes.StoreCustomer | null
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const [isOpen, setIsOpen] = React.useState(false)

  const { promotions = [] } = cart
  const removePromotionCode = async (code: string) => {
    const validPromotions = promotions.filter(
      (promotion) => promotion.code !== code
    )

    await applyPromotions(
      validPromotions.filter((p) => p.code === undefined).map((p) => p.code!)
    )
  }

  const addPromotionCode = async (formData: FormData) => {
    const code = formData.get("code")
    if (!code) {
      return
    }
    const input = document.getElementById("promotion-input") as HTMLInputElement
    const codes = promotions
      .filter((p) => p.code === undefined)
      .map((p) => p.code!)
    codes.push(code.toString())

    await applyPromotions(codes)

    if (input) {
      input.value = ""
    }
  }

  const [message, formAction] = useFormState(submitPromotionForm, null)

  return (
    <div className="w-full flex flex-col">
      <form action={(a) => addPromotionCode(a)} className="w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1.5"
          data-testid="add-discount-button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          {isOpen ? "Masquer" : "Ajouter un code promo"}
        </button>

        {isOpen && (
          <div className="mt-3 flex w-full gap-x-2">
            <Input
              className="flex-1"
              id="promotion-input"
              name="code"
              type="text"
              autoFocus={false}
              placeholder="Votre code promo"
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
            error={message}
            data-testid="discount-error-message"
          />
        )}
      </form>

      {promotions.length > 0 && (
        <div className="mt-3">
          {promotions.map((promotion) => (
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
                  {promotion.code}
                </Badge>
                {promotion.application_method?.value !== undefined &&
                  promotion.application_method.currency_code !== undefined && (
                    <span className="text-xs text-gray-500">
                      {promotion.application_method.type === "percentage"
                        ? `−${promotion.application_method.value}%`
                        : `−${convertToLocale({
                            amount: promotion.application_method.value,
                            currency_code: promotion.application_method.currency_code,
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
