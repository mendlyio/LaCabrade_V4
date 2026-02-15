"use server"

import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCartId } from "./cookies"
import { getOrSetCart } from "./cart"
import { sdk } from "@lib/config"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export interface GiftCardCartInput {
  variantId?: string
  customAmount?: number
  recipientEmail: string
  recipientName: string
  message?: string
  countryCode: string
}

export interface GiftCardProduct {
  id: string
  title: string
  handle: string
  description: string
  thumbnail: string | null
  variants: GiftCardVariant[]
}

export interface GiftCardVariant {
  id: string
  title: string
  sku: string | null
  calculated_price?: {
    calculated_amount: number
    currency_code: string
  }
}

/**
 * Récupère le produit Bon Cadeau et ses variants depuis Medusa.
 */
export async function getGiftCardProduct(
  regionId: string
): Promise<GiftCardProduct | null> {
  try {
    const { products } = await sdk.store.product.list(
      {
        handle: "bon-cadeau",
        region_id: regionId,
        fields:
          "id,title,handle,description,thumbnail,variants.id,variants.title,variants.sku,variants.calculated_price",
      },
      { next: { tags: ["gift-card-product"] } }
    )

    if (!products?.length) {
      return null
    }

    const product = products[0]
    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description || "",
      thumbnail: product.thumbnail || null,
      variants: (product.variants || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        sku: v.sku,
        calculated_price: v.calculated_price
          ? {
              calculated_amount: v.calculated_price.calculated_amount,
              currency_code: v.calculated_price.currency_code,
            }
          : undefined,
      })),
    }
  } catch (error) {
    console.error("[GiftCard] Erreur récupération produit:", error)
    return null
  }
}

/**
 * Ajoute un bon cadeau au panier via l'endpoint backend custom.
 * Gère les montants fixes (via variant) et personnalisés.
 */
export async function addGiftCardToCart(
  input: GiftCardCartInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const cart = await getOrSetCart(input.countryCode)
    if (!cart) {
      return { success: false, error: "Impossible de récupérer le panier" }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (PUBLISHABLE_KEY) {
      headers["x-publishable-api-key"] = PUBLISHABLE_KEY
    }

    const body: Record<string, any> = {
      cart_id: cart.id,
      recipient_email: input.recipientEmail,
      recipient_name: input.recipientName,
      message: input.message || "",
    }

    if (input.variantId) {
      body.variant_id = input.variantId
    } else if (input.customAmount) {
      body.custom_amount = input.customAmount
    }

    const res = await fetch(`${BACKEND_URL}/store/gift-card/add-to-cart`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Erreur inconnue" }))
      return { success: false, error: error.message }
    }

    revalidateTag("cart")
    return { success: true }
  } catch (error: any) {
    console.error("[GiftCard] Erreur ajout au panier:", error)
    return {
      success: false,
      error: error.message || "Erreur lors de l'ajout au panier",
    }
  }
}
