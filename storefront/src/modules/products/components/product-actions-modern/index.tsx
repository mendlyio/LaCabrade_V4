"use client"

import { useState, useEffect, useMemo } from "react"
import { HttpTypes } from "@medusajs/types"
import { isEqual } from "lodash"
import { useParams, useRouter } from "next/navigation"
import { addToCart } from "@lib/data/cart"
import WishlistToggleButton from "@modules/common/components/wishlist-toggle-button"

type ProductActionsModernProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
}

const optionsAsKeymap = (variantOptions: any) => {
  return variantOptions?.reduce((acc: Record<string, string | undefined>, varopt: any) => {
    if (varopt.option && varopt.value !== null && varopt.value !== undefined) {
      acc[varopt.option.title] = varopt.value
    }
    return acc
  }, {})
}

const isVariantAvailable = (variant?: HttpTypes.StoreProductVariant) => {
  if (!variant) {
    return false
  }

  if (!variant.manage_inventory) {
    return true
  }

  if (variant.allow_backorder) {
    return true
  }

  return (variant.inventory_quantity || 0) > 0
}

export default function ProductActionsModern({
  product,
  region,
}: ProductActionsModernProps) {
  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState("")
  const [notifySubmitted, setNotifySubmitted] = useState(false)
  const countryCode = useParams().countryCode as string
  const router = useRouter()

  // Présélectionner les options si un seul variant
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  // Trouver le variant sélectionné
  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // Vérifier le stock
  const inStock = useMemo(() => {
    return isVariantAvailable(selectedVariant)
  }, [selectedVariant])

  // Produit globalement épuisé ?
  const isProductGloballyOutOfStock = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return false
    return product.variants.every((v) => !isVariantAvailable(v))
  }, [product.variants])

  // Notification stock
  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notifyEmail) return

    try {
      await fetch("/api/stock-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: notifyEmail,
          variantId: selectedVariant?.id || product.variants?.[0]?.id,
          productTitle: product.title,
        }),
      })
      setNotifySubmitted(true)
      setNotifyEmail("")
    } catch (error) {
      console.error("Erreur notification stock:", error)
      setNotifySubmitted(true)
      setNotifyEmail("")
    }
  }

  // Quantité disponible
  const availableQuantity = useMemo(() => {
    if (!selectedVariant || !selectedVariant.manage_inventory || selectedVariant.allow_backorder) {
      return 999
    }
    return selectedVariant.inventory_quantity || 0
  }, [selectedVariant])

  useEffect(() => {
    if (availableQuantity !== 999 && quantity > availableQuantity) {
      setQuantity(Math.max(1, availableQuantity))
    }
  }, [availableQuantity, quantity])

  // Mettre à jour les options
  const setOptionValue = (title: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [title]: value,
    }))
  }

  // Ajouter au panier
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return
    
    setIsAdding(true)
    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity,
        countryCode,
      })
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 3000)
    } catch (error) {
      console.error("Erreur lors de l'ajout au panier:", error)
    } finally {
      setIsAdding(false)
    }
  }

  // Obtenir les options disponibles
  const productOptions = useMemo(() => {
    if (!product.variants || !product.options) return []

    return product.options.map((option) => {
      const values = product.variants!
        .map((v) => v.options?.find((o) => o.option_id === option.id)?.value)
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index)

      return {
        ...option,
        values,
      }
    })
  }, [product])

  const isOptionValueAvailable = (optionTitle: string, value: string) => {
    if (!product.variants) {
      return false
    }

    return product.variants.some((variant) => {
      if (!isVariantAvailable(variant)) {
        return false
      }

      const variantOptions = optionsAsKeymap(variant.options)
      if (variantOptions?.[optionTitle] !== value) {
        return false
      }

      return Object.entries(options).every(([title, selectedValue]) => {
        if (!selectedValue || title === optionTitle) {
          return true
        }

        return variantOptions?.[title] === selectedValue
      })
    })
  }

  return (
    <div className="space-y-6">
      {/* Options (Taille, Couleur, etc) */}
      {productOptions.length > 0 && (
        <div className="space-y-4">
          {productOptions.map((option) => (
            <div key={option.id}>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                {option.title}
                {options[option.title] && (
                  <span className="ml-2 font-normal text-amber-600">
                    : {options[option.title]}
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {option.values?.map((value) => {
                  const isSelected = options[option.title] === value
                  const isAvailable = isOptionValueAvailable(option.title, value as string)
                  return (
                    <button
                      key={value}
                      onClick={() => setOptionValue(option.title, value as string)}
                      disabled={!isAvailable}
                      className={`
                        px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all
                        ${
                          !isAvailable
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'border-amber-700 bg-amber-600 text-white shadow-sm'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                        }
                      `}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stock Info */}
      {selectedVariant && (
        <div className="flex items-center gap-2 text-sm">
          {inStock ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 font-medium">
                En stock
                {availableQuantity < 10 && availableQuantity !== 999 && (
                  <span className="ml-1 text-orange-600">
                    (Plus que {availableQuantity} disponible{availableQuantity > 1 ? 's' : ''})
                  </span>
                )}
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-700 font-medium">Rupture de stock</span>
            </>
          )}
        </div>
      )}

      {/* Quantity Selector */}
      {inStock && selectedVariant && (
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Quantité
          </label>
          <div className="inline-flex items-center border-2 border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              disabled={quantity <= 1}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                if (val > 0 && val <= availableQuantity) {
                  setQuantity(val)
                }
              }}
              min="1"
              max={availableQuantity}
              className="w-16 text-center py-3 border-0 font-semibold text-gray-900"
            />
            <button
              onClick={() => setQuantity(Math.min(availableQuantity, quantity + 1))}
              className="px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              disabled={quantity >= availableQuantity}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Add to Cart Button */}
      <div className="space-y-3">
        <button
          onClick={handleAddToCart}
          disabled={!selectedVariant || !inStock || isAdding}
          className={`
            w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300
            flex items-center justify-center gap-3 shadow-lg
            ${
              !selectedVariant || !inStock
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : addedToCart
                ? 'bg-green-600 text-white'
                : 'bg-amber-600 text-white hover:bg-amber-700 hover:shadow-xl hover:scale-105'
            }
          `}
        >
          {isAdding ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Ajout en cours...
            </>
          ) : addedToCart ? (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ajouté au panier !
            </>
          ) : !selectedVariant ? (
            <>
              Sélectionnez les options
            </>
          ) : !inStock ? (
            <>
              Rupture de stock
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Ajouter au panier
            </>
          )}
        </button>

        {/* Buy Now Button */}
        {selectedVariant && inStock && (
          <button
            onClick={async () => {
              if (!selectedVariant?.id) return
              setIsAdding(true)
              try {
                await addToCart({
                  variantId: selectedVariant.id,
                  quantity,
                  countryCode,
                })
                router.push(`/${countryCode}/checkout`)
              } catch (error) {
                console.error("Erreur:", error)
              } finally {
                setIsAdding(false)
              }
            }}
            disabled={isAdding}
            className="w-full py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Acheter maintenant
          </button>
        )}

        {/* Wishlist Button */}
        <div className="pt-2">
          <WishlistToggleButton productId={product.id!} variant="button" size="lg" />
        </div>
      </div>

      {/* Formulaire alertez-moi : variante épuisée OU produit globalement épuisé */}
      {((!inStock && selectedVariant) || isProductGloballyOutOfStock) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="font-bold text-gray-900">Alertez-moi du retour en stock</h3>
          </div>
          {notifySubmitted ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Merci ! Nous vous préviendrons dès le retour en stock.</span>
            </div>
          ) : (
            <form onSubmit={handleNotifyMe} className="flex gap-2">
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="Votre adresse email"
                required
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Notifier
              </button>
            </form>
          )}
          <p className="text-xs text-gray-500">
            Recevez un email dès que ce produit est de nouveau disponible.
          </p>
        </div>
      )}

      {/* Help Text */}
      <div className="text-sm text-gray-500 text-center">
        <p>🔒 Paiement 100% sécurisé</p>
      </div>
    </div>
  )
}

