"use client"

import { RadioGroup } from "@headlessui/react"
import { CheckCircleSolid } from "@medusajs/icons"
import { Button, Heading, Text, clx } from "@medusajs/ui"

import ErrorMessage from "@modules/checkout/components/error-message"
import PickupPoints from "@modules/checkout/components/pickup-points"
import StorePickup from "@modules/checkout/components/store-pickup"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { setShippingMethod, clearShippingMetadata } from "@lib/data/cart"
import { cartToTrackingCart, trackGA4AddShippingInfo } from "@lib/tracking"
import { formatAmount } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

/**
 * Détecte si une option de livraison correspond au retrait en magasin.
 */
function isStorePickupOption(
  option: HttpTypes.StoreCartShippingOption
): boolean {
  const name = (option.name ?? "").toLowerCase()
  const mode = ((option as any).data?.mode ?? (option as any).metadata?.mode ?? "").toLowerCase()
  return (
    mode === "store_pickup" ||
    (name.includes("retrait") && name.includes("magasin")) ||
    (name.includes("click") && name.includes("collect"))
  )
}

/** Bpost Point Relais (mode pickup) */
function isBpostPickupOption(option: HttpTypes.StoreCartShippingOption): boolean {
  const isBpost = (option.provider_id ?? "").toLowerCase().includes("bpost")
  const mode = ((option as any).data?.mode ?? (option as any).metadata?.mode ?? "").toLowerCase()
  return isBpost && mode === "pickup"
}

/** Bpost Domicile (mode home) — toute option Bpost qui n'est pas Point Relais */
function isBpostHomeOption(option: HttpTypes.StoreCartShippingOption): boolean {
  return (
    (option.provider_id ?? "").toLowerCase().includes("bpost") &&
    !isBpostPickupOption(option)
  )
}

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
  /** Sélection optimiste : affichée immédiatement au clic, avant la réponse API */
  const [pendingMethodId, setPendingMethodId] = useState<string | null>(null)
  const deliveryOptionsRef = useRef<HTMLDivElement>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const selectedShippingMethod = availableShippingMethods?.find(
    (method) => method.id === cart.shipping_methods?.at(-1)?.shipping_option_id
  )

  /** Valeur affichée : optimiste si en cours, sinon la valeur du panier */
  const displayedMethodId = pendingMethodId ?? selectedShippingMethod?.id
  const displayedMethod = availableShippingMethods?.find((o) => o.id === displayedMethodId)

  const hasShipping = (cart.shipping_methods?.length ?? 0) > 0

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    if (cart?.items?.length && selectedShippingMethod) {
      const trackingCart = cartToTrackingCart(
        cart.items as any,
        (cart as any).currency_code ?? "EUR",
        cart.subtotal ?? undefined
      )
      trackGA4AddShippingInfo(trackingCart, selectedShippingMethod.name ?? "")
    }
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const set = async (id: string) => {
    const newOption = availableShippingMethods?.find((o) => o.id === id)
    if (!newOption) return

    // Feedback immédiat : afficher la sélection tout de suite (ne pas effacer avant que le cart soit à jour)
    setPendingMethodId(id)
    setError(null)

    setIsLoading(true)
    try {
      // Réinitialiser l'adresse de livraison vers la facturation quand on quitte
      // le point relais ou le retrait magasin pour toute option nécessitant l'adresse client
      const requiresCustomerAddress =
        !isBpostPickupOption(newOption) && !isStorePickupOption(newOption)

      await clearShippingMetadata({
        cartId: cart.id,
        clearBpostPickup: true,
        clearPickupLocation: true,
        resetShippingToBilling: requiresCustomerAddress,
      })

      await setShippingMethod({ cartId: cart.id, shippingMethodId: id })

      router.refresh()
      // Ne pas effacer pendingMethodId ici : on le garde jusqu'à ce que le cart soit rafraîchi
    } catch (err: any) {
      setError(err?.message ?? "Erreur lors du changement")
      setPendingMethodId(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Effacer pendingMethodId une fois que le cart reflète notre sélection
  useEffect(() => {
    if (pendingMethodId && selectedShippingMethod?.id === pendingMethodId) {
      setPendingMethodId(null)
    }
  }, [pendingMethodId, selectedShippingMethod?.id])

  useEffect(() => {
    setError(null)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        deliveryOptionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 150)
      return () => clearTimeout(timer)
    }
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
          <div ref={deliveryOptionsRef} className="pb-6">
            <RadioGroup value={displayedMethodId ?? ""} onChange={set}>
              <div className="space-y-3">
                {(Array.isArray(availableShippingMethods) ? availableShippingMethods : []).map((option) => {
                  const isSelected = option.id === displayedMethodId
                  const isOptionLoading = isSelected && isLoading
                  return (
                    <RadioGroup.Option
                      key={option.id}
                      value={option.id}
                      data-testid="delivery-option-radio"
                      className={clx(
                        "relative flex items-center justify-between py-4 px-5 border-2 rounded-xl transition-all duration-200",
                        {
                          "border-amber-500 bg-amber-50 shadow-sm": isSelected,
                          "border-gray-200 hover:border-gray-300 hover:bg-gray-50": !isSelected,
                          "cursor-pointer": !isLoading,
                          "cursor-wait opacity-90": isOptionLoading,
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
                          {isSelected && !isOptionLoading && (
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                          )}
                          {isOptionLoading && (
                            <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
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
                        {formatAmount(
                          (option as any)?.calculated_price?.calculated_amount ?? option.amount,
                          cart?.currency_code ?? "eur"
                        )}
                      </span>
                    </RadioGroup.Option>
                  )
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Bpost : Points relais — affiché dès la sélection (optimiste) */}
          {displayedMethod?.provider_id?.toLowerCase?.().includes("bpost") &&
            ((displayedMethod as any)?.metadata?.mode === "pickup" || 
             (displayedMethod as any)?.data?.mode === "pickup") && (
            <div className="mt-4">
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 mb-2">
                  Choisissez un point relais.
                </p>
                {/* Liens directs pour changer de mode sans bouton */}
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(availableShippingMethods) ? availableShippingMethods : [])
                    .filter((o) => o.id !== displayedMethod?.id && (isBpostHomeOption(o) || isBpostPickupOption(o)))
                    .map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => set(o.id)}
                        disabled={isLoading}
                        className="text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline underline-offset-2 transition-colors disabled:opacity-50"
                      >
                        → {o.name}
                      </button>
                    ))}
                </div>
              </div>
              <PickupPoints key={displayedMethod.id} cart={cart} />
            </div>
          )}

          {/* Bpost Domicile : lien pour passer au Point Relais */}
          {displayedMethod && isBpostHomeOption(displayedMethod) && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">Préférez un point relais ?</p>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(availableShippingMethods) ? availableShippingMethods : [])
                  .filter(isBpostPickupOption)
                  .map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => set(o.id)}
                      disabled={isLoading}
                      className="text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline underline-offset-2 transition-colors disabled:opacity-50"
                    >
                      → {o.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Retrait en magasin : sélection du point de retrait */}
          {displayedMethod && isStorePickupOption(displayedMethod) && (
            <StorePickup key={displayedMethod.id} cart={cart} />
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
            disabled={
              !cart.shipping_methods?.[0] ||
              (selectedShippingMethod &&
                isStorePickupOption(selectedShippingMethod) &&
                !(cart.metadata?.pickup_location as any)?.id)
            }
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
                {formatAmount(
                  (selectedShippingMethod as any)?.calculated_price?.calculated_amount ?? selectedShippingMethod?.amount,
                  cart?.currency_code ?? "eur"
                )}
              </p>
              {/* Adresse affichée selon le mode : point relais / retrait magasin / domicile */}
              {selectedShippingMethod && isStorePickupOption(selectedShippingMethod) && (cart.metadata?.pickup_location as any)?.name && (
                <p className="text-sm text-amber-700 font-medium mt-2">
                  📍 {(cart.metadata.pickup_location as any).name}
                </p>
              )}
              {selectedShippingMethod && isBpostPickupOption(selectedShippingMethod) && (cart.metadata?.bpost_pickup_point as any)?.Name && (
                <p className="text-sm text-amber-700 font-medium mt-2">
                  📍 {(cart.metadata.bpost_pickup_point as any).Name}
                </p>
              )}
              {selectedShippingMethod && !isStorePickupOption(selectedShippingMethod) && !isBpostPickupOption(selectedShippingMethod) && cart?.shipping_address && (
                <p className="text-sm text-gray-700 mt-2">
                  📍 {[
                    cart.shipping_address.address_1,
                    cart.shipping_address.postal_code,
                    cart.shipping_address.city,
                  ].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Shipping
