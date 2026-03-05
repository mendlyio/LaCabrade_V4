"use client"

import { Button } from "@medusajs/ui"
import { isEqual } from "lodash"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { useIntersection } from "@lib/hooks/use-in-view"
import OptionSelect from "@modules/products/components/product-actions/option-select"

import MobileActions from "./mobile-actions"
import { addToCart } from "@lib/data/cart"
import { trackGA4AddToCart, trackMetaAddToCart } from "@lib/tracking"
import { HttpTypes } from "@medusajs/types"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (variantOptions: any): Record<string, string | undefined> => {
  if (!variantOptions || !Array.isArray(variantOptions) || variantOptions.length === 0) {
    return {}
  }
  return variantOptions.reduce((acc: Record<string, string | undefined>, varopt: any) => {
    const title = varopt.option?.title ?? varopt.option_id
    if (title && varopt.value !== null && varopt.value !== undefined) {
      acc[title] = varopt.value
    }
    return acc
  }, {})
}

// Vérifie si une variante est en stock
const isVariantInStock = (variant: HttpTypes.StoreProductVariant): boolean => {
  // Si on ne gère pas l'inventaire, c'est toujours disponible
  if (!variant.manage_inventory) {
    return true
  }
  
  // Si les backorders sont autorisés, c'est toujours disponible
  if (variant.allow_backorder) {
    return true
  }
  
  // Sinon, vérifier la quantité en stock
  return (variant.inventory_quantity || 0) > 0
}

// Calcule les valeurs d'options indisponibles en fonction des sélections actuelles
const getDisabledOptionValues = (
  product: HttpTypes.StoreProduct,
  currentOptionTitle: string,
  selectedOptions: Record<string, string | undefined>
): string[] => {
  const variants = product.variants || []
  const option = product.options?.find(opt => opt.title === currentOptionTitle)
  if (!option || !option.values) return []
  
  const disabledValues: string[] = []
  
  // Pour chaque valeur de cette option
  for (const optionValue of option.values) {
    const value = optionValue.value
    if (!value) continue
    
    // Créer un objet d'options hypothétique avec cette valeur
    const hypotheticalOptions = {
      ...selectedOptions,
      [currentOptionTitle]: value
    }
    
    // Chercher si au moins une variante correspond à ces options ET est en stock
    const hasAvailableVariant = variants.some(variant => {
      const variantOptions = optionsAsKeymap(variant.options)
      
      // Vérifier si la variante correspond aux options sélectionnées
      const matchesSelection = Object.entries(hypotheticalOptions).every(([key, val]) => {
        // Si l'option n'est pas encore sélectionnée, on ne filtre pas dessus
        if (!val) return true
        return variantOptions[key] === val
      })
      
      // Si la variante correspond, vérifier le stock
      return matchesSelection && isVariantInStock(variant)
    })
    
    // Si aucune variante disponible pour cette valeur, la désactiver
    if (!hasAvailableVariant) {
      disabledValues.push(value)
    }
  }
  
  return disabledValues
}

export default function ProductActions({
  product,
  region,
  disabled,
}: ProductActionsProps) {
  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [email, setEmail] = useState("")
  const [notifySubmitted, setNotifySubmitted] = useState(false)
  const countryCode = useParams().countryCode as string

  // Présélectionner si un seul variant ou pas d'options distinctes
  useEffect(() => {
    if (!product.variants?.length) return

    if (product.variants.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions)
      return
    }

    // Pas d'options réelles (toutes les valeurs identiques) → auto-sélection
    const hasRealOptions = product.options && product.options.length > 0 &&
      product.options.some((o) => {
        const uniqueValues = new Set(
          product.variants!
            .map((v) => v.options?.find((vo) => vo.option_id === o.id)?.value)
            .filter(Boolean)
        )
        return uniqueValues.size > 1
      })

    if (!hasRealOptions) {
      const firstAvailable = product.variants.find(isVariantInStock) || product.variants[0]
      const variantOptions = optionsAsKeymap(firstAvailable.options)
      setOptions(variantOptions)
    }
  }, [product.variants, product.options])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (title: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [title]: value,
    }))
  }

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  // Get inventory quantity for stock message
  const inventoryQuantity = useMemo(() => {
    if (!selectedVariant || !selectedVariant.manage_inventory) {
      return null
    }
    return selectedVariant.inventory_quantity || 0
  }, [selectedVariant])

  // Vérifier si le produit est globalement épuisé (toutes variantes)
  const isProductGloballyOutOfStock = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return false
    return product.variants.every((v) => !isVariantInStock(v))
  }, [product.variants])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity: 1,
      countryCode,
    })

    const amount = (selectedVariant as any)?.calculated_price?.calculated_amount
    const currency = (selectedVariant as any)?.calculated_price?.currency_code ?? "EUR"
    if (amount != null) {
      const item = {
        item_id: selectedVariant.id,
        item_name: product.title ?? "Produit",
        price: amount,
        quantity: 1,
        item_variant: selectedVariant.title,
        item_category: (product as any).categories?.[0]?.name,
      }
      trackGA4AddToCart(item, currency)
      trackMetaAddToCart(item, currency)
    }

    setIsAdding(false)
  }

  // Handle stock notification
  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      const response = await fetch('/api/stock-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          variantId: selectedVariant?.id || product.variants?.[0]?.id,
          productTitle: product.title,
        }),
      })

      if (response.ok) {
        setNotifySubmitted(true)
        setEmail("")
      } else {
        console.error("Erreur lors de l'enregistrement de la notification")
        // On affiche quand même le succès pour l'UX
        setNotifySubmitted(true)
        setEmail("")
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la notification:", error)
      // On affiche quand même le succès pour l'UX
      setNotifySubmitted(true)
      setEmail("")
    }
  }

  return (
    <>
      <div className="flex flex-col gap-y-6" ref={actionsRef}>
        {/* Variantes (couleur, taille, etc.) */}
        {(product.variants?.length ?? 0) > 1 && (
          <div className="space-y-4">
            {(product.options || []).map((option) => {
              // Calculer les valeurs indisponibles pour cette option
              const disabledValues = getDisabledOptionValues(
                product,
                option.title ?? "",
                options
              )
              
              return (
                <div key={option.id}>
                  <OptionSelect
                    option={option}
                    current={options[option.title ?? ""]}
                    updateOption={setOptionValue}
                    title={option.title ?? ""}
                    data-testid="product-options"
                    disabled={!!disabled || isAdding}
                    disabledValues={disabledValues}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* Informations de stock */}
        {selectedVariant && (
          <div className="flex items-center gap-2 text-sm">
            {inStock ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-semibold">
                  {inventoryQuantity === 1 
                    ? "Plus qu'1 en stock !" 
                    : "En stock"}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-red-700 font-semibold">Rupture de stock</span>
              </>
            )}
          </div>
        )}

        {/* Bouton Ajouter au panier OU Formulaire de notification */}
        {inStock && !isProductGloballyOutOfStock ? (
          <Button
            onClick={handleAddToCart}
            disabled={!selectedVariant || !!disabled || isAdding}
            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold text-lg rounded-xl"
            isLoading={isAdding}
            data-testid="add-product-button"
          >
            {!selectedVariant
              ? "Sélectionnez les options"
              : "Ajouter au panier"}
          </Button>
        ) : null}

        {/* Formulaire alertez-moi : affiché si variante épuisée OU produit globalement épuisé */}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
          getDisabledValues={(optionTitle) => getDisabledOptionValues(product, optionTitle, options)}
        />
      </div>
    </>
  )
}
