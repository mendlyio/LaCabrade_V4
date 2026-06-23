import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  completeCartWorkflow,
  createCartCreditLinesWorkflow,
} from "@medusajs/medusa/core-flows"
import { GIFT_CARD_TRACKING_MODULE } from "../../../../modules/gift-card-tracking/constants"

type AppliedGiftCard = { code: string; balance: number }

/**
 * POST /store/custom/complete-gift-card-cart
 *
 * Finalise un panier intégralement couvert par un (ou plusieurs) bon(s) cadeau.
 *
 * Contexte : les bons cadeau sont stockés en metadata (applied_gift_cards) et
 * réduisent uniquement le montant à payer côté storefront — ils ne réduisent PAS
 * le total Medusa du panier. Quand un panier est couvert à 100 % par bon cadeau,
 * aucune session de paiement Stripe n'est créée, et le complete standard échoue
 * (« Payment sessions are required to complete cart »).
 *
 * Solution : on ajoute un credit_line égal au total du panier (mécanisme natif
 * Medusa pour les commandes à 0 €). Le total passe alors à 0 → completeCart
 * autorise la finalisation sans paiement. La déduction du solde des bons cadeau
 * est gérée par le subscriber gift-card-used (order.placed).
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cart_id } = req.body as { cart_id?: string }

  if (!cart_id) {
    return res.status(400).json({ message: "cart_id est requis" })
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const cartModuleService = req.scope.resolve(Modules.CART) as any
    const orderModuleService = req.scope.resolve(Modules.ORDER) as any

    // ── 0. Si le panier est déjà finalisé, renvoyer la commande existante ──────
    const { data: existingLinks } = await query.graph({
      entity: "order_cart",
      fields: ["order_id"],
      filters: { cart_id },
    })
    const existingOrderId = existingLinks?.[0]?.order_id
    if (existingOrderId) {
      const order = await orderModuleService.retrieveOrder(existingOrderId)
      return res.json({ type: "order", order })
    }

    // ── 1. Total Medusa du panier + credit lines existantes ────────────────────
    const { data: cartRows } = await query.graph({
      entity: "cart",
      fields: ["id", "total", "completed_at", "credit_lines.id", "credit_lines.reference"],
      filters: { id: cart_id },
    })
    const cartRow = cartRows?.[0]
    if (!cartRow) {
      return res.status(404).json({ message: "Panier introuvable" })
    }

    const cartTotal = Number(cartRow.total ?? 0)

    // ── 2. Re-valider les bons cadeau appliqués (metadata) ─────────────────────
    const cart = await cartModuleService.retrieveCart(cart_id, { select: ["id", "metadata"] })
    const applied: AppliedGiftCard[] = (cart.metadata as any)?.applied_gift_cards ?? []

    let validBalanceSum = 0
    try {
      const giftCardService = req.scope.resolve(GIFT_CARD_TRACKING_MODULE) as any
      for (const a of applied) {
        const [gcs] = await giftCardService.listAndCountGiftCards({ code: a.code }, { take: 1 })
        const gc = gcs?.[0]
        if (!gc) continue
        if (gc.status === "disabled" || gc.status === "depleted") continue
        validBalanceSum += Number(gc.balance ?? 0)
      }
    } catch {
      // Si le service est indisponible, on retombe sur les soldes du metadata
      validBalanceSum = applied.reduce((s, a) => s + Number(a.balance ?? 0), 0)
    }

    // ── 3. Vérifier la couverture intégrale ────────────────────────────────────
    // Tolérance de 1 centime pour les arrondis.
    if (cartTotal > 0 && validBalanceSum + 0.01 < cartTotal) {
      return res.status(400).json({
        message:
          "Le bon cadeau ne couvre pas la totalité de la commande. Veuillez régler le solde par un autre moyen de paiement.",
      })
    }

    // ── 4. Ajouter un credit_line pour amener le total à 0 (si nécessaire) ──────
    const hasGiftCardCreditLine = (cartRow.credit_lines ?? []).some(
      (cl: any) => cl?.reference === "gift_card"
    )
    if (cartTotal > 0 && !hasGiftCardCreditLine) {
      await createCartCreditLinesWorkflow(req.scope).run({
        input: [
          {
            cart_id,
            amount: cartTotal,
            reference: "gift_card",
            reference_id: cart_id,
            metadata: { applied_gift_cards: applied.map((a) => a.code) },
          },
        ] as any,
      })
    }

    // ── 5. Finaliser le panier ─────────────────────────────────────────────────
    const { result } = await completeCartWorkflow(req.scope).run({
      input: { id: cart_id },
    })

    const orderId = (result as any)?.id
    if (!orderId) {
      return res.status(500).json({
        type: "cart",
        error: { message: "La commande n'a pas pu être créée." },
      })
    }

    const order = await orderModuleService.retrieveOrder(orderId)
    return res.json({ type: "order", order })
  } catch (error: any) {
    console.error("[complete-gift-card-cart] Error:", error?.message)
    return res.status(500).json({
      type: "cart",
      error: { message: error?.message ?? "Erreur lors de la finalisation." },
    })
  }
}
