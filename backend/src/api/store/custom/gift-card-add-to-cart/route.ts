import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ICartModuleService, IProductModuleService } from "@medusajs/framework/types"
import {
  GIFT_CARD_PRODUCT_HANDLE,
  giftCardMetadata,
  resolveGiftCardFaceValueEuros,
  validateCustomGiftCardAmount,
} from "../../../../utils/gift-card-amount"

interface AddGiftCardToCartBody {
  cart_id: string
  variant_id?: string
  custom_amount?: number | string
  recipient_email: string
  recipient_name: string
  message?: string
}

/**
 * POST /store/custom/gift-card-add-to-cart
 *
 * Ajoute un bon cadeau au panier avec les métadonnées du destinataire.
 * Le unit_price est toujours en euros (10–500), is_custom_price=true pour
 * empêcher Medusa de rétablir le prix catalogue en centimes (GC-050 = 5000).
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const {
      cart_id,
      variant_id,
      custom_amount,
      recipient_email,
      recipient_name,
      message,
    } = req.body as AddGiftCardToCartBody

    if (!cart_id) {
      res.status(400).json({ message: "cart_id est requis" })
      return
    }

    if (!recipient_email || !recipient_email.includes("@")) {
      res.status(400).json({ message: "Un email de destinataire valide est requis" })
      return
    }

    if (!recipient_name || recipient_name.trim().length === 0) {
      res.status(400).json({ message: "Le nom du destinataire est requis" })
      return
    }

    if (message && message.length > 500) {
      res.status(400).json({ message: "Le message ne peut pas dépasser 500 caractères" })
      return
    }

    if (!variant_id && custom_amount === undefined) {
      res.status(400).json({ message: "variant_id ou custom_amount est requis" })
      return
    }

    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART)
    const productModuleService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)

    const recipientMeta = {
      recipient_email: recipient_email.trim().toLowerCase(),
      recipient_name: recipient_name.trim(),
      gift_message: message?.trim() || "",
    }

    const giftCardProducts = await productModuleService.listProducts(
      { handle: GIFT_CARD_PRODUCT_HANDLE },
      { relations: ["variants"], take: 1 }
    )

    if (!giftCardProducts.length) {
      res.status(404).json({
        message: "Produit Bon Cadeau non trouvé. Veuillez exécuter le seed.",
      })
      return
    }

    const giftCardProduct = giftCardProducts[0]
    const productVariants = giftCardProduct.variants || []

    let amountEuros: number
    let variant: (typeof productVariants)[number] | undefined
    let type: "fixed" | "custom"

    if (variant_id) {
      variant = productVariants.find((v: any) => v.id === variant_id)
      if (!variant) {
        const listed = await productModuleService.listProductVariants(
          { id: variant_id },
          { take: 1 }
        )
        variant = listed[0]
        if (!variant || (variant as any).product_id !== giftCardProduct.id) {
          res.status(400).json({ message: "Variant bon cadeau invalide" })
          return
        }
      }

      const resolved = resolveGiftCardFaceValueEuros({
        sku: variant.sku,
        title: variant.title,
        unitPrice: (variant as any).calculated_price?.calculated_amount,
      })

      if (resolved == null) {
        res.status(400).json({
          message:
            "Impossible de déterminer le montant de ce bon cadeau (plafond 500€)",
        })
        return
      }

      amountEuros = resolved
      type = "fixed"
    } else {
      const custom = validateCustomGiftCardAmount(custom_amount)
      if (custom.ok) {
        amountEuros = custom.amount
      } else {
        res.status(400).json({ message: custom.message })
        return
      }
      type = "custom"
      variant = productVariants[0]
      if (!variant) {
        const variants = await productModuleService.listProductVariants(
          { product_id: giftCardProduct.id },
          { take: 1 }
        )
        variant = variants[0]
      }
      if (!variant) {
        res.status(500).json({
          message:
            "Aucun variant trouvé pour le produit Bon Cadeau. Exécutez le script de seed : npx medusa exec src/scripts/seed-gift-card.ts",
        })
        return
      }
    }

    const metadata = giftCardMetadata(recipientMeta, amountEuros)
    const variantSku =
      type === "custom" ? `GC-CUSTOM-${amountEuros}` : variant.sku || undefined

    const [lineItem] = await cartModuleService.addLineItems(cart_id, [
      {
        title: `Bon Cadeau ${amountEuros}€`,
        subtitle: "La Cabrade",
        thumbnail: giftCardProduct.thumbnail || undefined,
        product_id: giftCardProduct.id,
        product_title: giftCardProduct.title,
        variant_id: variant.id,
        variant_title: `Bon Cadeau ${amountEuros}€`,
        variant_sku: variantSku,
        quantity: 1,
        unit_price: amountEuros,
        is_custom_price: true,
        is_tax_inclusive: true,
        metadata,
      },
    ])

    console.log(
      `[GiftCard] ✅ Bon cadeau ${amountEuros}€ (${type}${variant.sku ? ` ${variant.sku}` : ""}) ajouté au cart ${cart_id} pour ${recipient_email}`
    )

    res.status(200).json({
      success: true,
      type,
      amount: amountEuros,
      variant_id: variant.id,
      line_item_id: lineItem.id,
      recipient_email,
    })
  } catch (error: any) {
    console.error("[GiftCard] ❌ Erreur:", error)
    res.status(500).json({
      message: error.message || "Erreur lors de l'ajout du bon cadeau",
    })
  }
}
