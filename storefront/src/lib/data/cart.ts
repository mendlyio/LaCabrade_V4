"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { omit } from "lodash"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { getAuthHeaders, getCartId, removeCartId, setCartId } from "./cookies"
import { getProductsById } from "./products"
import { getRegion } from "./regions"

export async function retrieveCart() {
  const cartId = getCartId()

  if (!cartId) {
    return null
  }

  return await sdk.store.cart
    .retrieve(cartId, {}, { next: { tags: ["cart"] }, ...getAuthHeaders() })
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
    setCartId(cart.id)
    revalidateTag("cart")
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(
      cart.id,
      { region_id: region.id },
      {},
      getAuthHeaders()
    )
    revalidateTag("cart")
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = getCartId()
  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  return sdk.store.cart
    .update(cartId, data, {}, getAuthHeaders())
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
      getAuthHeaders()
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

  const cartId = getCartId()
  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, getAuthHeaders())
    .then(() => {
      revalidateTag("cart")
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = getCartId()
  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, getAuthHeaders())
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
    products = await getProductsById({ ids: productIds, regionId })
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
      getAuthHeaders()
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
      getAuthHeaders()
    )
    .then(({ cart }) => {
      revalidateTag("cart")
      return cart
    })
    .catch(medusaError)
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: {
    provider_id: string
    context?: Record<string, unknown>
  }
) {
  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, getAuthHeaders())
    .then((resp) => {
      revalidateTag("cart")
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[]) {
  const cartId = getCartId()
  if (!cartId) {
    throw new Error("No existing cart found")
  }

  await updateCart({ promo_codes: codes })
    .then(() => {
      revalidateTag("cart")
    })
    .catch(medusaError)
}

export async function applyGiftCard(code: string) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function removeDiscount(code: string) {
  // const cartId = getCartId()
  // if (!cartId) return "No cartId cookie found"
  // try {
  //   await deleteDiscount(cartId, code)
  //   revalidateTag("cart")
  // } catch (error: any) {
  //   throw error
  // }
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: any[]
  // giftCards: GiftCard[]
) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, {
  //       gift_cards: [...giftCards]
  //         .filter((gc) => gc.code !== codeToRemove)
  //         .map((gc) => ({ code: gc.code })),
  //     }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
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
    const cartId = getCartId()
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
  const cartId = getCartId()
  if (!cartId) {
    throw new Error("No existing cart found when placing an order")
  }

  const cartRes = await sdk.store.cart
    .complete(cartId, {}, getAuthHeaders())
    .then((cartRes) => {
      revalidateTag("cart")
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order" && cartRes?.order?.id) {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase() ||
      cartRes.order.billing_address?.country_code?.toLowerCase() ||
      "be"
    removeCartId()
    redirect(`/${countryCode}/order/confirmed/${cartRes.order.id}`)
  }

  return cartRes.cart
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = getCartId()
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
