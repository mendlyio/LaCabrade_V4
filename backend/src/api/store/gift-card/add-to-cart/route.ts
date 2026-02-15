import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ICartModuleService, IProductModuleService } from "@medusajs/framework/types"

interface AddGiftCardToCartBody {
  cart_id: string
  variant_id?: string
  custom_amount?: number
  recipient_email: string
  recipient_name: string
  message?: string
}

/**
 * POST /store/gift-card/add-to-cart
 *
 * Ajoute un bon cadeau au panier avec les métadonnées du destinataire.
 * Supporte les montants fixes (via variant_id) et les montants personnalisés (via custom_amount).
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

    // --- Validation ---
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

    if (!variant_id && !custom_amount) {
      res.status(400).json({ message: "variant_id ou custom_amount est requis" })
      return
    }

    if (custom_amount !== undefined) {
      if (typeof custom_amount !== "number" || custom_amount < 10) {
        res.status(400).json({ message: "Le montant personnalisé doit être d'au moins 10€" })
        return
      }
      if (custom_amount > 500) {
        res.status(400).json({ message: "Le montant personnalisé ne peut pas dépasser 500€" })
        return
      }
    }

    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART)
    const productModuleService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)

    const giftCardMetadata = {
      is_gift_card: true,
      recipient_email: recipient_email.trim().toLowerCase(),
      recipient_name: recipient_name.trim(),
      gift_message: message?.trim() || "",
    }

    if (variant_id) {
      // --- Montant fixe via variant ---
      // Utiliser le workflow standard add-to-cart
      const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE) as any

      await workflowEngine.run("add-to-cart", {
        input: {
          cart_id,
          items: [{ variant_id, quantity: 1 }],
        },
        transactionId: `gift-card-add-${cart_id}-${Date.now()}`,
      })

      // Récupérer le cart pour trouver le line item ajouté
      const cart = await cartModuleService.retrieveCart(cart_id, {
        relations: ["items"],
      })

      const lineItem = cart.items?.find(
        (item: any) => item.variant_id === variant_id
      )

      if (lineItem) {
        // Ajouter les métadonnées gift card au line item
        await cartModuleService.updateLineItems(lineItem.id, {
          metadata: {
            ...((lineItem.metadata as Record<string, unknown>) || {}),
            ...giftCardMetadata,
          },
        })
      }

      console.log(
        `[GiftCard] ✅ Bon cadeau (variant ${variant_id}) ajouté au cart ${cart_id} pour ${recipient_email}`
      )

      res.status(200).json({
        success: true,
        type: "fixed",
        variant_id,
        recipient_email,
      })
    } else if (custom_amount) {
      // --- Montant personnalisé ---
      // On cherche le produit gift card pour avoir les infos de base
      const giftCardProducts = await productModuleService.listProducts(
        { handle: "bon-cadeau" },
        { relations: ["variants"] }
      )

      if (!giftCardProducts.length) {
        res.status(404).json({ message: "Produit Bon Cadeau non trouvé. Veuillez exécuter le seed." })
        return
      }

      const giftCardProduct = giftCardProducts[0]
      // Utiliser le premier variant comme référence
      const referenceVariant = giftCardProduct.variants?.[0]

      if (!referenceVariant) {
        res.status(500).json({ message: "Aucun variant trouvé pour le produit Bon Cadeau" })
        return
      }

      // Convertir en centimes
      const amountInCents = Math.round(custom_amount * 100)

      // Ajouter le line item avec un prix personnalisé directement via le cart module
      const [lineItem] = await cartModuleService.addLineItems(cart_id, [
        {
          title: `Bon Cadeau ${custom_amount}€`,
          subtitle: "La Cabrade",
          thumbnail: giftCardProduct.thumbnail || undefined,
          product_id: giftCardProduct.id,
          product_title: giftCardProduct.title,
          variant_id: referenceVariant.id,
          variant_title: `Bon Cadeau ${custom_amount}€`,
          variant_sku: `GC-CUSTOM-${amountInCents}`,
          quantity: 1,
          unit_price: amountInCents,
          is_tax_inclusive: true,
          metadata: giftCardMetadata,
        },
      ])

      console.log(
        `[GiftCard] ✅ Bon cadeau personnalisé ${custom_amount}€ ajouté au cart ${cart_id} pour ${recipient_email}`
      )

      res.status(200).json({
        success: true,
        type: "custom",
        amount: custom_amount,
        line_item_id: lineItem.id,
        recipient_email,
      })
    }
  } catch (error: any) {
    console.error("[GiftCard] ❌ Erreur:", error)
    res.status(500).json({
      message: error.message || "Erreur lors de l'ajout du bon cadeau",
    })
  }
}
