/**
 * Débloque une commande dont l'expédition est marquée « expédiée » alors qu'on doit
 * l'annuler pour pouvoir rembourser (l'API refuse cancel si shipped_at est défini).
 *
 * Cas gérés :
 * - Expédiée mais pas annulée : on efface shipped_at puis on lance cancelOrderFulfillmentWorkflow.
 * - Annulée mais shipped_at encore présent (état incohérent / UI grisée) : on efface seulement shipped_at.
 *
 * Usage (depuis backend/, avec accès à la même base que la prod) :
 *   ORDER_DISPLAY_ID=66 npx medusa exec src/scripts/unstick-order-fulfillment.ts
 *
 * Sans Redis local si besoin :
 *   REDIS_URL= ORDER_DISPLAY_ID=66 npx medusa exec src/scripts/unstick-order-fulfillment.ts
 */

import { cancelOrderFulfillmentWorkflow } from "@medusajs/core-flows"
import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

function parseDisplayId(): number {
  const fromEnv = process.env.ORDER_DISPLAY_ID
  if (fromEnv && /^\d+$/.test(fromEnv)) {
    return parseInt(fromEnv, 10)
  }
  const arg = process.argv.find((a) => /^\d+$/.test(a))
  if (arg) {
    return parseInt(arg, 10)
  }
  return 66
}

export default async function unstickOrderFulfillment({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModule = container.resolve(Modules.ORDER) as any
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as any
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY) as any

  const displayId = parseDisplayId()
  logger.info(`\n🔧 Déblocage fulfillment — commande #${displayId}\n`)

  const orders = await orderModule.listOrders(
    { display_id: displayId },
    { take: 1 }
  )

  if (!orders.length) {
    logger.error(`❌ Aucune commande avec display_id=${displayId}.`)
    return
  }

  const orderId = orders[0].id as string

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: { id: orderId },
    fields: [
      "id",
      "display_id",
      "status",
      "fulfillments.id",
      "fulfillments.shipped_at",
      "fulfillments.canceled_at",
      "fulfillments.delivered_at",
    ],
  })

  const result = await remoteQuery(queryObject)
  const order = Array.isArray(result) ? result[0] : result

  if (!order?.fulfillments?.length) {
    logger.info("ℹ️  Aucune fulfillment liée à cette commande — rien à débloquer côté expédition.")
    return
  }

  for (const f of order.fulfillments as any[]) {
    const fid = f.id as string
    logger.info(`— Fulfillment ${fid}`)
    logger.info(`   shipped_at=${f.shipped_at ?? "null"}  canceled_at=${f.canceled_at ?? "null"}  delivered_at=${f.delivered_at ?? "null"}`)

    if (f.delivered_at) {
      logger.warn(
        "   ⚠️  Livraison marquée comme livrée (delivered_at). Annuler une fulfillment livrée n'est pas supporté par ce script — contacter le support Medusa ou corriger manuellement en base."
      )
      continue
    }

    // État incohérent : annulé en base mais shipped_at resté → UI bizarre, refund parfois bloqué
    if (f.canceled_at && f.shipped_at) {
      logger.warn("   Correction incohérence : retrait de shipped_at (déjà canceled_at).")
      await fulfillmentModule.updateFulfillment(fid, { shipped_at: null })
      logger.info("   ✅ shipped_at effacé.")
      continue
    }

    // Encore « expédié » mais pas annulé : on débloque puis workflow officiel
    if (f.shipped_at && !f.canceled_at) {
      logger.warn("   Déblocage : effacement de shipped_at puis annulation via workflow Medusa…")
      await fulfillmentModule.updateFulfillment(fid, { shipped_at: null })

      await cancelOrderFulfillmentWorkflow(container).run({
        input: {
          order_id: orderId,
          fulfillment_id: fid,
          no_notification: true,
        },
      })
      logger.info("   ✅ Fulfillment annulée (workflow). Tu peux rafraîchir l’admin et rembourser.")
      continue
    }

    if (f.canceled_at) {
      logger.info("   ℹ️  Déjà annulée (canceled_at). Rien à faire pour cette ligne.")
    } else {
      logger.info("   ℹ️  Pas expédiée — annulation normalement possible depuis l’admin (POST cancel).")
    }
  }

  logger.info("\n✅ Terminé.\n")
}
