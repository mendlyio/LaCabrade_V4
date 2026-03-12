import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /store/custom/initiate-payment-with-total
 *
 * Initie une session de paiement en utilisant le montant TTC fourni par le frontend.
 * Corrige le bug Medusa où la payment collection peut exclure la TVA.
 *
 * Body: {
 *   cart_id: string
 *   payment_collection_id: string
 *   provider_id: string
 *   amount: number  // Total TTC à charger (ex: 79.38)
 *   data?: Record<string, unknown>  // Options Stripe (payment_method_types, etc.)
 * }
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const {
      cart_id,
      payment_collection_id,
      provider_id,
      amount,
      data = {},
    } = req.body as {
      cart_id: string
      payment_collection_id: string
      provider_id: string
      amount: number
      data?: Record<string, unknown>
    }

    if (!payment_collection_id || !provider_id) {
      res.status(400).json({
        message: "payment_collection_id et provider_id sont requis",
      })
      return
    }

    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({
        message: "amount doit être un nombre positif (total TTC en euros)",
      })
      return
    }

    const paymentModuleService = req.scope.resolve(Modules.PAYMENT) as any
    const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE) as any

    // 1. Mettre à jour le montant de la payment collection avec le total TTC du frontend
    await paymentModuleService.updatePaymentCollections(
      { id: payment_collection_id },
      { amount }
    )

    // 2. Créer la session de paiement (workflow standard)
    await workflowEngine.run("create-payment-sessions", {
      input: {
        payment_collection_id,
        provider_id,
        data,
        customer_id: req.body.customer_id,
        context: req.body.context,
      },
      transactionId: `init-payment-${payment_collection_id}-${Date.now()}`,
    })

    // 3. Récupérer la payment collection avec les sessions pour la réponse
    const [paymentCollection] = await paymentModuleService.listPaymentCollections(
      { id: payment_collection_id },
      { relations: ["payment_sessions"] }
    )

    res.status(200).json({
      payment_collection: paymentCollection || { id: payment_collection_id, amount },
    })
  } catch (error: any) {
    console.error("[initiate-payment-with-total] Erreur:", error)
    res.status(500).json({
      message: error?.message || "Erreur lors de l'initiation du paiement",
    })
  }
}
