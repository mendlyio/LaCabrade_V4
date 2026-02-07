"use client"

import { RadioGroup } from "@headlessui/react"
import { CheckCircleSolid } from "@medusajs/icons"
import { Button, Heading, Text, clx } from "@medusajs/ui"

import Divider from "@modules/common/components/divider"
import ErrorMessage from "@modules/checkout/components/error-message"
import PickupPoints from "@modules/checkout/components/pickup-points"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { setShippingMethod } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const selectedShippingMethod = availableShippingMethods?.find(
    (method) => method.id === cart.shipping_methods?.at(-1)?.shipping_option_id
  )

  const hasShipping = (cart.shipping_methods?.length ?? 0) > 0

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const set = async (id: string) => {
    setIsLoading(true)
    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-white">
      {/* Step header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            !isOpen && hasShipping
              ? "bg-green-100 text-green-600"
              : isOpen
                ? "bg-amber-600 text-white"
                : "bg-gray-100 text-gray-400"
          }`}>
            {!isOpen && hasShipping ? (
              <CheckCircleSolid className="w-5 h-5" />
            ) : (
              "2"
            )}
          </div>
          <div>
            <Heading
              level="h2"
              className={clx("text-base font-bold", {
                "text-gray-900": isOpen || hasShipping,
                "text-gray-400": !isOpen && !hasShipping,
              })}
            >
              Livraison
            </Heading>
            {!isOpen && hasShipping && (
              <p className="text-xs text-gray-500 mt-0.5">Étape complétée</p>
            )}
          </div>
        </div>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <button
              onClick={handleEdit}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
              data-testid="edit-delivery-button"
            >
              Modifier
            </button>
          )}
      </div>

      {isOpen ? (
        <div data-testid="delivery-options-container">
          <div className="pb-6">
            <RadioGroup value={selectedShippingMethod?.id} onChange={set}>
              <div className="space-y-3">
                {availableShippingMethods?.map((option) => {
                  const isSelected = option.id === selectedShippingMethod?.id
                  return (
                    <RadioGroup.Option
                      key={option.id}
                      value={option.id}
                      data-testid="delivery-option-radio"
                      className={clx(
                        "relative flex items-center justify-between cursor-pointer py-4 px-5 border-2 rounded-xl transition-all duration-200",
                        {
                          "border-amber-500 bg-amber-50 shadow-sm": isSelected,
                          "border-gray-200 hover:border-gray-300 hover:bg-gray-50": !isSelected,
                        }
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={clx(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          {
                            "border-amber-600": isSelected,
                            "border-gray-300": !isSelected,
                          }
                        )}>
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                          )}
                        </div>
                        <div>
                          <span className={clx("text-sm font-medium", {
                            "text-gray-900": isSelected,
                            "text-gray-700": !isSelected,
                          })}>
                            {option.name}
                          </span>
                        </div>
                      </div>
                      <span className={clx("text-sm font-semibold", {
                        "text-amber-700": isSelected,
                        "text-gray-600": !isSelected,
                      })}>
                        {option.amount != null && !isNaN(option.amount) 
                          ? convertToLocale({
                              amount: option.amount,
                              currency_code: cart?.currency_code,
                            })
                          : "5,00 €"
                        }
                      </span>
                    </RadioGroup.Option>
                  )
                })}
              </div>
            </RadioGroup>
          </div>

          {selectedShippingMethod?.provider_id?.toLowerCase?.().includes("bpost") &&
            ((selectedShippingMethod as any)?.metadata?.mode === "pickup" || 
             (selectedShippingMethod as any)?.data?.mode === "pickup") && (
            <PickupPoints cart={cart} />
          )}

          <ErrorMessage
            error={error}
            data-testid="delivery-option-error-message"
          />

          <Button
            size="large"
            className="mt-4 w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!cart.shipping_methods?.[0]}
            data-testid="submit-delivery-option-button"
          >
            Continuer vers le paiement
          </Button>
        </div>
      ) : (
        <div>
          {cart && hasShipping && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Mode de livraison
              </p>
              <p className="text-sm font-medium text-gray-900">
                {selectedShippingMethod?.name}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {selectedShippingMethod?.amount != null && !isNaN(selectedShippingMethod.amount)
                  ? convertToLocale({
                      amount: selectedShippingMethod.amount,
                      currency_code: cart?.currency_code,
                    })
                  : "5,00 €"
                }
              </p>
            </div>
          )}
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
