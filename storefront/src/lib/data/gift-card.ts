"use server"

import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCartId, setCartId } from "./cookies"
import { getRegion } from "./regions"
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
 * Récupère ou crée le panier via le SDK Medusa.
 */
async function getOrCreateCart(countryCode: string) {
  const region = await getRegion(countryCode)
  if (!region) throw new Error(`Région non trouvée pour: ${countryCode}`)

  let cartId = await getCartId()
  if (cartId) {
    try {
      const { cart } = await sdk.store.cart.retrieve(
        cartId,
        {},
        { next: { tags: ["cart"] }, ...(await getAuthHeaders()) }
      )
      if (cart.region_id !== region.id) {
        await sdk.store.cart.update(
          cartId,
          { region_id: region.id },
          {},
          await getAuthHeaders()
        )
      }
      return cart
    } catch {
      // Cart expiré ou invalide, en créer un nouveau
    }
  }

  const { cart } = await sdk.store.cart.create(
    { region_id: region.id },
    {},
    await getAuthHeaders()
  )
  await setCartId(cart.id)
  revalidateTag("cart")
  return cart
}

/**
 * Ajoute un bon cadeau au panier.
 *
 * - Montant fixe (variantId) : utilise le SDK directement → plus fiable, pas de dépendance au workflow engine
 * - Montant personnalisé : utilise l'endpoint backend custom (prix libre)
 */
export async function addGiftCardToCart(
  input: GiftCardCartInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const cart = await getOrCreateCart(input.countryCode)
    if (!cart?.id) {
      return { success: false, error: "Impossible de créer le panier" }
    }

    const metadata: Record<string, unknown> = {
      is_gift_card: true,
      recipient_email: input.recipientEmail.trim().toLowerCase(),
      recipient_name: input.recipientName.trim(),
      gift_message: input.message?.trim() || "",
    }

    // ── Montant fixe : SDK standard ──────────────────────────────────────────
    if (input.variantId) {
      await sdk.store.cart.createLineItem(
        cart.id,
        {
          variant_id: input.variantId,
          quantity: 1,
          metadata,
        },
        {},
        await getAuthHeaders()
      )
      revalidateTag("cart")
      return { success: true }
    }

    // ── Montant personnalisé : backend custom ────────────────────────────────
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
        const err = await res.json().catch(() => ({ message: "Erreur inconnue" }))
        return {
          success: false,
          error: err?.message || err?.error || `Erreur serveur (${res.status})`,
        }
      }

      revalidateTag("cart")
      return { success: true }
    }

    return { success: false, error: "Veuillez sélectionner un montant" }
  } catch (error: any) {
    console.error("[GiftCard] Erreur ajout au panier:", error)
    return {
      success: false,
      error: error?.message || "Erreur lors de l'ajout au panier",
    }
  }
}
