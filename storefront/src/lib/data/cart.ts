"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { omit } from "lodash"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getAuthHeadersSafe,
  getCartId,
  getCartIdSafe,
  removeCartId,
  removeCartIdSafe,
  setCartCountSafe,
  setCartId,
  setCartIdSafe,
} from "./cookies"
import { getProductsById } from "./products"
import { getRegion } from "./regions"
import { getPaymentAmountFromCart } from "@lib/util/get-payment-amount"

export async function retrieveCart() {
  const cartId = await getCartIdSafe()

  if (!cartId) {
    return null
  }

  return await sdk.store.cart
    .retrieve(cartId, {}, { next: { tags: ["cart"] }, ...(await getAuthHeadersSafe()) })
    .then(({ cart }) => cart)
    .catch(() => {
      return null
    })
}

export async function getOrSetCart(countryCode: string) {
  let cart = await retrieveCart()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (!cart) {
    const cartResp = await sdk.store.cart.create({ region_id: region.id })
    cart = cartResp.cart
    await setCartIdSafe(cart.id)
    revalidateTag("cart")
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(
      cart.id,
      { region_id: region.id },
      {},
      await getAuthHeadersSafe()
    )
    revalidateTag("cart")
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartIdSafe()
  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  return sdk.store.cart
    .update(cartId, data, {}, await getAuthHeadersSafe())
    .then(({ cart }) => {
      revalidateTag("cart")
      return cart
    })
    .catch(medusaError)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)
  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      await getAuthHeadersSafe()
    )
    .then(() => {
      revalidateTag("cart")
    })
    .catch(medusaError)
}

export async function addLastChanceItem({
  variantId,
  countryCode,
}: {
  variantId: string
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID")
  }

  const cart = await getOrSetCart(countryCode)
  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  // Ajouter le publishable key si disponible
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  if (publishableKey) {
    headers["x-publishable-api-key"] = publishableKey
  }

  const res = await fetch(`${backendUrl}/store/custom/last-chance-add`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      cart_id: cart.id,
      variant_id: variantId,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erreur inconnue" }))
    throw new Error(error.message || "Erreur lors de l'ajout last chance")
  }

  revalidateTag("cart")
  return res.json()
}

export async function addOutletItem({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity?: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID")
  }

  const cart = await getOrSetCart(countryCode)
  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  if (publishableKey) {
    headers["x-publishable-api-key"] = publishableKey
  }

  const res = await fetch(`${backendUrl}/store/custom/outlet-add-to-cart`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      cart_id: cart.id,
      variant_id: variantId,
      quantity: quantity ?? 1,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erreur inconnue" }))
    throw new Error(error.message || "Erreur lors de l'ajout outlet")
  }

  revalidateTag("cart")
  return res.json()
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartIdSafe()
  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, await getAuthHeadersSafe())
    .then(() => {
      revalidateTag("cart")
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartIdSafe()
  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, await getAuthHeadersSafe())
    .then(() => {
      revalidateTag("cart")
    })
    .catch(medusaError)
  revalidateTag("cart")
}

export async function enrichLineItems(
  lineItems:
    | HttpTypes.StoreCartLineItem[]
    | HttpTypes.StoreOrderLineItem[]
    | null,
  regionId: string
) {
  if (!lineItems || !regionId) return lineItems ? [...lineItems] : []

  const productIds = lineItems
    .map((lineItem) => lineItem.product_id)
    .filter(Boolean) as string[]

  if (!lineItems?.length || productIds.length === 0) {
    return lineItems as HttpTypes.StoreCartLineItem[]
  }

  let products: HttpTypes.StoreProduct[] = []
  try {
    products = await getProductsById({ ids: productIds, regionId, skipInventoryCheck: true })
  } catch {
    return lineItems as HttpTypes.StoreCartLineItem[]
  }

  if (!products?.length) {
    return lineItems as HttpTypes.StoreCartLineItem[]
  }

  // Enrich line items with product and variant information
  const enrichedItems = lineItems.map((item) => {
    const product = products.find((p: any) => p.id === item.product_id)
    const variant = product?.variants?.find(
      (v: any) => v.id === item.variant_id
    )

    // If product or variant is not found, return the original item
    if (!product || !variant) {
      return item
    }

    // If product and variant are found, enrich the item
    return {
      ...item,
      variant: {
        ...variant,
        product: omit(product, "variants"),
      },
    }
  }) as HttpTypes.StoreCartLineItem[]

  return enrichedItems
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  return sdk.store.cart
    .addShippingMethod(
      cartId,
      { option_id: shippingMethodId },
      {},
      await getAuthHeadersSafe()
    )
    .then(() => {
      revalidateTag("cart")
    })
    .catch(medusaError)
}

/**
 * Sauvegarde le lieu de retrait en magasin dans les métadonnées du panier.
 * Passer `null` pour effacer la sélection.
 */
/**
 * Nettoie les métadonnées de livraison lors d'un changement de méthode.
 * À appeler quand l'utilisateur change de Bpost Point Relais ↔ Domicile ou retrait magasin.
 */
export async function clearShippingMetadata({
  cartId,
  clearBpostPickup = true,
  clearPickupLocation = true,
  resetShippingToBilling = false,
}: {
  cartId: string
  clearBpostPickup?: boolean
  clearPickupLocation?: boolean
  resetShippingToBilling?: boolean
}) {
  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (publishableKey) headers["x-publishable-api-key"] = publishableKey

  const res = await fetch(`${backendUrl}/store/custom/clear-shipping-metadata`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      cart_id: cartId,
      clear_bpost_pickup: clearBpostPickup,
      clear_pickup_location: clearPickupLocation,
      reset_shipping_to_billing: resetShippingToBilling,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erreur inconnue" }))
    throw new Error(err.message || "Erreur lors de la réinitialisation")
  }

  revalidateTag("cart")
}

export async function setPickupLocation({
  cartId,
  pickupLocation,
}: {
  cartId: string
  pickupLocation: { id: string; name: string; address: string } | null
}) {
  return sdk.store.cart
    .update(
      cartId,
      { metadata: { pickup_location: pickupLocation } } as any,
      {},
      await getAuthHeadersSafe()
    )
    .then(({ cart }) => {
      revalidateTag("cart")
      return cart
    })
    .catch(medusaError)
}

/** Moyens de paiement pour pp_stripe_stripe (montant >= 50€) */
const STRIPE_PAYMENT_METHOD_TYPES_FULL = [
  "card", // Carte bancaire + Apple Pay / Google Pay (via wallets)
  "bancontact",
  "klarna",
  "alma",
  "link",
]

/** Klarna, Alma, Link ont un minimum ~50€. En dessous : carte + Bancontact uniquement. */
const STRIPE_PAYMENT_METHOD_TYPES_LOW_AMOUNT = ["card", "bancontact"]
const STRIPE_MIN_AMOUNT_CENTS = 5000 // 50€

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: {
    provider_id: string
    context?: Record<string, unknown>
  }
) {
  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  const authHeaders = await getAuthHeadersSafe()
  if (authHeaders) Object.assign(headers, authHeaders)
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  if (publishableKey) headers["x-publishable-api-key"] = publishableKey

  // Re-validate gift cards before computing amount: removes disabled/depleted codes
  let cartForAmount: HttpTypes.StoreCart = cart
  try {
    const validateRes = await fetch(
      `${backendUrl}/store/custom/validate-cart-gift-cards`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ cart_id: cart.id }),
      }
    )
    if (validateRes.ok) {
      const { applied_gift_cards, removed } = await validateRes.json()
      if (removed?.length > 0) {
        // Patch the local cart object with cleaned metadata so amount is correct
        cartForAmount = {
          ...cart,
          metadata: {
            ...(cart.metadata ?? {}),
            applied_gift_cards,
          },
        }
        // Revalidate cart tag so the UI reflects the removal
        revalidateTag("cart")
      }
    }
  } catch {
    // Non-blocking: fall back to cart as-is if validation fails
  }

  const amount = getPaymentAmountFromCart(cartForAmount as any)
  const stripeData =
    data.provider_id === "pp_stripe_stripe"
      ? {
          payment_method_types:
            amount >= STRIPE_MIN_AMOUNT_CENTS
              ? STRIPE_PAYMENT_METHOD_TYPES_FULL
              : STRIPE_PAYMENT_METHOD_TYPES_LOW_AMOUNT,
          automatic_payment_methods: { enabled: false },
          capture_method: "automatic",
        }
      : {}
  let paymentCollectionId = (cart as any).payment_collection?.id

  // Si pas encore de payment collection, en créer une via le SDK
  if (!paymentCollectionId && amount > 0) {
    try {
      const resp = await sdk.store.payment
        .initiatePaymentSession(
          cart,
          {
            provider_id: data.provider_id,
            data: stripeData,
          },
          {},
          authHeaders
        )
      paymentCollectionId = (resp as any)?.payment_collection?.id
      if (paymentCollectionId) {
        revalidateTag("cart")
      }
    } catch {
      // SDK échoue : tenter malgré tout l'endpoint custom sans payment_collection_id
    }
  }

  if (amount > 0) {
    const res = await fetch(
      `${backendUrl}/store/custom/initiate-payment-with-total`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          cart_id: cart.id,
          ...(paymentCollectionId ? { payment_collection_id: paymentCollectionId } : {}),
          provider_id: data.provider_id,
          amount,
          data: stripeData,
          context: data.context,
        }),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.message || `Erreur paiement: ${res.status}`)
    }
    const result = await res.json()
    revalidateTag("cart")
    return result
  }

  // Montant = 0 (couvert par bon cadeau) : pas de session de paiement nécessaire
  revalidateTag("cart")
  return { payment_collection: cart.payment_collection }
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartIdSafe()
  if (!cartId) {
    throw new Error("No existing cart found")
  }

  await updateCart({ promo_codes: codes })
  // updateCart gère déjà revalidateTag("cart") et medusaError en interne
}

export async function applyGiftCardToCart(code: string) {
  const cartId = await getCartIdSafe()
  if (!cartId) throw new Error("Aucun panier trouvé")

  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  if (publishableKey) headers["x-publishable-api-key"] = publishableKey

  const res = await fetch(`${backendUrl}/store/custom/apply-gift-card`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cart_id: cartId, code }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erreur inconnue" }))
    throw new Error(err.message || "Impossible d'appliquer le bon cadeau")
  }

  revalidateTag("cart")
  return res.json()
}

export async function removeGiftCardFromCart(code: string) {
  const cartId = await getCartIdSafe()
  if (!cartId) throw new Error("Aucun panier trouvé")

  const backendUrl =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
  if (publishableKey) headers["x-publishable-api-key"] = publishableKey

  const res = await fetch(`${backendUrl}/store/custom/remove-gift-card`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cart_id: cartId, code }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erreur inconnue" }))
    throw new Error(err.message || "Impossible de retirer le bon cadeau")
  }

  revalidateTag("cart")
}

export async function removeDiscount(code: string) {
  // unused – kept for backwards compat
}

export async function removeGiftCard(codeToRemove: string, _giftCards?: any[]) {
  return removeGiftCardFromCart(codeToRemove)
}

const ONE_TIME_PROMO_CODES = ["SORRY15"]

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = (formData.get("code") as string).toUpperCase().trim()

  if (ONE_TIME_PROMO_CODES.includes(code)) {
    try {
      const { getCustomer } = await import("./customer")
      const { listOrders } = await import("./orders")
      const customer = await getCustomer()

      if (customer) {
        const orders = await listOrders(100, 0)
        const alreadyUsed = (orders ?? []).some((order: any) =>
          (order.promotions ?? []).some(
            (p: any) => p.code?.toUpperCase() === code
          )
        )
        if (alreadyUsed) {
          return "Ce code promo a déjà été utilisé sur votre compte."
        }
      }
    } catch {
      // En cas d'erreur de vérification, on laisse Medusa trancher
    }
  }

  try {
    const cart = await retrieveCart()
    const existingCodes = (cart?.promotions ?? [])
      .filter((p: any) => p.code != null && !p.is_automatic)
      .map((p: any) => p.code as string)
    await applyPromotions([...existingCodes, code])
  } catch (e: any) {
    return e.message
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cartId = await getCartIdSafe()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const data = {
      shipping_address: {
        first_name: formData.get("shipping_address.first_name"),
        last_name: formData.get("shipping_address.last_name"),
        address_1: formData.get("shipping_address.address_1"),
        address_2: "",
        company: formData.get("shipping_address.company"),
        postal_code: formData.get("shipping_address.postal_code"),
        city: formData.get("shipping_address.city"),
        country_code: formData.get("shipping_address.country_code"),
        province: formData.get("shipping_address.province"),
        phone: formData.get("shipping_address.phone"),
      },
      email: formData.get("email"),
    } as any

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") data.billing_address = data.shipping_address

    if (sameAsBilling !== "on")
      data.billing_address = {
        first_name: formData.get("billing_address.first_name"),
        last_name: formData.get("billing_address.last_name"),
        address_1: formData.get("billing_address.address_1"),
        address_2: "",
        company: formData.get("billing_address.company"),
        postal_code: formData.get("billing_address.postal_code"),
        city: formData.get("billing_address.city"),
        country_code: formData.get("billing_address.country_code"),
        province: formData.get("billing_address.province"),
        phone: formData.get("billing_address.phone"),
      }
    // Récupérer le numéro de TVA validé s'il est présent
    const vatNumber = formData.get("vat_number") as string
    if (vatNumber) {
      data.metadata = {
        ...(data.metadata || {}),
        vat_number: vatNumber,
      }
    } else {
      // Supprimer le numéro de TVA si le champ est vide (l'utilisateur l'a retiré)
      data.metadata = {
        ...(data.metadata || {}),
        vat_number: null,
      }
    }

    await updateCart(data)
  } catch (e: any) {
    return e.message
  }

  redirect(
    `/${formData.get("shipping_address.country_code")}/checkout?step=delivery`
  )
}

export async function placeOrder() {
  const cartId = await getCartIdSafe()
  if (!cartId) {
    throw new Error("No existing cart found when placing an order")
  }

  const cartRes = await completeCartById(cartId)

  if (cartRes?.type === "order" && cartRes?.order?.id) {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase() ||
      cartRes.order.billing_address?.country_code?.toLowerCase() ||
      "fr"
    await removeCartIdSafe()
    await setCartCountSafe(0)
    revalidateTag("order")
    redirect(`/${countryCode}/order/confirmed/${cartRes.order.id}`)
  }

  if (cartRes?.type === "cart") {
    const errorMsg =
      (cartRes as any)?.error?.message ||
      "Le paiement n'a pas pu être finalisé. Veuillez réessayer."
    throw new Error(errorMsg)
  }

  return cartRes?.cart ?? null
}

export async function completeCartById(cartId: string) {
  if (!cartId) {
    throw new Error("No existing cart found when placing an order")
  }

  return sdk.store.cart
    .complete(cartId, {}, await getAuthHeadersSafe())
    .then((cartRes) => {
      revalidateTag("cart")
      return cartRes
    })
    .catch(medusaError)
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartIdSafe()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    revalidateTag("cart")
  }

  revalidateTag("regions")
  revalidateTag("products")

  redirect(`/${countryCode}${currentPath}`)
}
