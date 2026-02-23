"use server"

import { revalidateTag } from "next/cache"
import { getAuthHeaders } from "./cookies"
import { getOrSetCart } from "./cart"
import { sdk } from "@lib/config"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * Ajoute un bon cadeau au panier via l'API standard Medusa (variant_id + metadata).
 * Utilise le SDK pour plus de fiabilité.
 */
async function addGiftCardViaSdk(
  cartId: string,
  variantId: string,
  metadata: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    await sdk.store.cart.createLineItem(
      cartId,
      {
        variant_id: variantId,
        quantity: 1,
        metadata,
      },
      {},
      getAuthHeaders()
    )
    revalidateTag("cart")
    return { success: true }
  } catch (error: any) {
    console.error("[GiftCard] Erreur SDK createLineItem:", error)
    const msg =
      error?.message ||
      error?.cause?.message ||
      "Erreur lors de l'ajout au panier"
    return { success: false, error: msg }
  }
}

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
 * Ajoute un bon cadeau au panier.
 * - Montant fixe (variant_id) : utilise l'API standard Medusa via SDK.
 * - Montant personnalisé : utilise l'endpoint backend custom.
 */
export async function addGiftCardToCart(
  input: GiftCardCartInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const cart = await getOrSetCart(input.countryCode)
    if (!cart) {
      return { success: false, error: "Impossible de récupérer le panier" }
    }

    const metadata = {
      recipient_email: input.recipientEmail,
      recipient_name: input.recipientName,
      message: input.message || "",
    }

    if (input.variantId) {
      return addGiftCardViaSdk(cart.id, input.variantId, metadata)
    }

    if (input.customAmount) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (PUBLISHABLE_KEY) {
        headers["x-publishable-api-key"] = PUBLISHABLE_KEY
      }
      const res = await fetch(
        `${BACKEND_URL}/store/custom/gift-card-add-to-cart`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            cart_id: cart.id,
            custom_amount: input.customAmount,
            recipient_email: input.recipientEmail,
            recipient_name: input.recipientName,
            message: input.message || "",
          }),
        }
      )
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Erreur inconnue" }))
        const msg =
          error?.message || error?.error || `Erreur serveur (${res.status})`
        return { success: false, error: msg }
      }
      revalidateTag("cart")
      return { success: true }
    }

    return { success: false, error: "Veuillez sélectionner un montant" }
  } catch (error: any) {
    console.error("[GiftCard] Erreur ajout au panier:", error)
    const msg =
      error?.message ||
      (error?.code === "ECONNREFUSED"
        ? "Impossible de joindre le serveur. Vérifiez que le backend est démarré."
        : "Erreur lors de l'ajout au panier")
    return { success: false, error: msg }
  }
}
