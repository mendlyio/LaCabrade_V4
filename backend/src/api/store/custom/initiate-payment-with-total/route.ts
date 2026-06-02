import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import {
  getCartPaymentAmountCents,
  getInsurableGoodsEuros,
  getInsuranceTier,
} from "../../../../utils/cart-amounts"

/**
 * POST /store/custom/initiate-payment-with-total
 *
 * Initie (ou met à jour) une session de paiement avec le montant TTC autoritatif
 * recalculé côté serveur à partir de l'état courant du panier. Corrige le bug
 * Medusa v2 où la payment collection peut exclure la TVA ou mal gérer les promos
 * item (stockés en HT alors que les prix sont TTC).
 *
 * Body: {
 *   cart_id: string                        (requis)
 *   payment_collection_id?: string         (optionnel — résolu/créé automatiquement si absent)
 *   provider_id: string                    (requis)
 *   amount?: number                        (optionnel — indicatif frontend, cents)
 *   data?: Record<string, unknown>         (options Stripe : payment_method_types…)
 *   customer_id?: string
 *   context?: Record<string, unknown>
 * }
 *
 * Garanties:
 *   1. Le montant chargé est TOUJOURS calculé côté serveur à partir du panier
 *      actuel (items, adjustments, shipping_methods, bons cadeau, TVA intra-com).
 *   2. L'écart avec le montant indiqué par le frontend est loggé au-delà de 2 centimes
 *      pour faciliter le diagnostic d'éventuels désalignements (stale cache, etc.).
 *   3. En cas de panier vide / montant <= 0, l'endpoint ne crée pas de session.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const body = req.body as {
      cart_id?: string
      payment_collection_id?: string
      provider_id?: string
      amount?: number
      data?: Record<string, unknown>
      customer_id?: string
      context?: Record<string, unknown>
    }
    const {
      cart_id,
      payment_collection_id,
      provider_id,
      amount: frontendAmountCents,
      data = {},
      customer_id,
      context,
    } = body

    if (!cart_id || !provider_id) {
      res.status(400).json({
        message: "cart_id et provider_id sont requis",
      })
      return
    }

    const cartModuleService = req.scope.resolve(Modules.CART) as ICartModuleService
    const paymentModuleService = req.scope.resolve(Modules.PAYMENT) as any
    const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE) as any

    // 1. Recharger le panier complet depuis la base → source de vérité.
    const cartRelations = [
      "items",
      "items.adjustments",
      "shipping_methods",
      "shipping_methods.adjustments",
      "shipping_address",
    ]
    let cart = await cartModuleService.retrieveCart(cart_id, {
      relations: cartRelations,
    })

    // 1a. Recalcul du palier d'assurance d'après la valeur ACTUELLE des articles.
    //     Évite un montant figé si le panier a changé après avoir coché l'assurance
    //     (ex. ajout d'un article faisant franchir un palier). Au-delà de 5 000 €
    //     (palier indisponible), on conserve le dernier montant valide.
    const insurance = (cart.metadata as any)?.insurance as
      | { enabled?: boolean; amount?: number; tier?: string }
      | undefined
    if (insurance?.enabled) {
      const goods = getInsurableGoodsEuros(cart as any)
      const tier = getInsuranceTier(goods)
      const freshAmount = tier.available ? tier.amount : Number(insurance.amount || 0)
      const freshTier = tier.available ? tier.label : insurance.tier
      if (Number(insurance.amount || 0) !== freshAmount) {
        await cartModuleService.updateCarts([
          {
            id: cart_id,
            metadata: {
              ...(cart.metadata as Record<string, unknown>),
              insurance: {
                ...insurance,
                amount: freshAmount,
                tier: freshTier,
                goods_value: goods,
              },
            },
          },
        ])
        // Recharger pour que le calcul du montant utilise la valeur fraîche.
        cart = await cartModuleService.retrieveCart(cart_id, {
          relations: cartRelations,
        })
      }
    }

    // 1b. Résoudre payment_collection_id : utiliser celui fourni, sinon
    //     le récupérer depuis la relation cart, ou le créer via le workflow.
    let resolvedPaymentCollectionId = payment_collection_id
    if (!resolvedPaymentCollectionId) {
      // Récupérer le panier avec sa relation payment_collection
      try {
        const cartWithPC = await cartModuleService.retrieveCart(cart_id, {
          relations: ["payment_collection"],
        })
        resolvedPaymentCollectionId = (cartWithPC as any).payment_collection?.id
      } catch {
        // La relation peut ne pas être chargée par le cart module selon la version
      }

      // Si toujours pas trouvé, créer via le workflow standard Medusa
      if (!resolvedPaymentCollectionId) {
        try {
          const result = await workflowEngine.run(
            "create-payment-collection-for-cart",
            {
              input: { cart_id },
              transactionId: `create-pc-${cart_id}-${Date.now()}`,
            }
          )
          resolvedPaymentCollectionId =
            result?.result?.id ||
            result?.result?.payment_collection?.id ||
            (result as any)?.id

          // Re-chercher après le workflow si l'ID n'est pas dans le résultat direct
          if (!resolvedPaymentCollectionId) {
            const cartAfterPC = await cartModuleService.retrieveCart(cart_id, {
              relations: ["payment_collection"],
            })
            resolvedPaymentCollectionId = (cartAfterPC as any).payment_collection?.id
          }
        } catch (pcError: any) {
          console.error(
            "[initiate-payment-with-total] Impossible de créer la payment collection:",
            pcError?.message
          )
        }
      }
    }

    if (!resolvedPaymentCollectionId) {
      res.status(400).json({
        message:
          "Impossible de résoudre ou créer la payment collection pour ce panier. " +
          "Veuillez rafraîchir la page et réessayer.",
      })
      return
    }

    // 2. Calculer le montant autoritatif avec la logique partagée storefront/backend.
    const authoritativeCents = getCartPaymentAmountCents(cart as any)

    // 3. Comparer avec le montant envoyé par le frontend (si fourni).
    //    Tolérance 2 centimes pour absorber les arrondis ; au-delà on logge.
    if (typeof frontendAmountCents === "number" && frontendAmountCents > 0) {
      const delta = Math.abs(authoritativeCents - frontendAmountCents)
      if (delta > 2) {
        console.warn(
          `[initiate-payment-with-total] Écart frontend/backend pour cart ${cart_id}: ` +
            `frontend=${frontendAmountCents}¢, backend=${authoritativeCents}¢, ` +
            `delta=${delta}¢. Le backend fait autorité.`
        )
      }
    }

    if (authoritativeCents <= 0) {
      res.status(400).json({
        message:
          "Le montant calculé pour ce panier est nul. Impossible d'initier un paiement.",
      })
      return
    }

    // Stripe impose un minimum de 50 centimes pour EUR.
    // On vérifie ici pour donner un message clair au lieu d'un 500 Stripe.
    if (provider_id === "pp_stripe_stripe" && authoritativeCents < 50) {
      res.status(400).json({
        message:
          `Le montant (${(authoritativeCents / 100).toFixed(2)} €) est inférieur au minimum Stripe de 0,50 €. ` +
          "Ajoutez un article ou retirez le bon cadeau qui réduit le montant en dessous du seuil.",
      })
      return
    }

    // 4. Mettre à jour la payment collection avec le montant autoritatif.
    //    Le provider Stripe multiplie par 100 pour obtenir les centimes ;
    //    on stocke donc en euros côté payment collection.
    const amountEuros = authoritativeCents / 100
    await paymentModuleService.updatePaymentCollections(
      { id: resolvedPaymentCollectionId },
      { amount: amountEuros }
    )

    // 5. Créer/mettre à jour les sessions de paiement.
    await workflowEngine.run("create-payment-sessions", {
      input: {
        payment_collection_id: resolvedPaymentCollectionId,
        provider_id,
        data,
        customer_id,
        context,
      },
      transactionId: `init-payment-${resolvedPaymentCollectionId}-${Date.now()}`,
    })

    // 6. Récupérer la payment collection avec les sessions pour la réponse.
    const [paymentCollection] = await paymentModuleService.listPaymentCollections(
      { id: resolvedPaymentCollectionId },
      { relations: ["payment_sessions"] }
    )

    res.status(200).json({
      payment_collection:
        paymentCollection || { id: resolvedPaymentCollectionId, amount: amountEuros },
      authoritative_amount_cents: authoritativeCents,
    })
  } catch (error: any) {
    console.error("[initiate-payment-with-total] Erreur:", error)
    res.status(500).json({
      message: error?.message || "Erreur lors de l'initiation du paiement",
    })
  }
}
