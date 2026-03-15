import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Vérifie ce que la page de remerciement reçoit comme données.
 * Compare les données du module order (utilisé par les emails)
 * vs l'API Store (utilisée par la page de remerciement).
 *
 * Usage: REDIS_URL= medusa exec src/scripts/test-thankyou-page-amounts.ts
 */
export default async function testThankYouPageAmounts({ container }: ExecArgs) {
  const orderModuleService = container.resolve(Modules.ORDER) as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any

  console.log(`\n${"=".repeat(80)}`)
  console.log(`  DIAGNOSTIC PAGE DE REMERCIEMENT — Champs disponibles`)
  console.log(`${"=".repeat(80)}\n`)

  // Récupérer les dernières commandes via le module order
  const orders = await orderModuleService.listOrders(
    {},
    {
      take: 3,
      order: { created_at: "DESC" },
      relations: ["items", "summary", "shipping_address", "shipping_methods"],
    }
  )

  if (!orders.length) {
    console.log("❌ Aucune commande trouvée.")
    return
  }

  for (const order of orders) {
    const displayId = order.display_id || order.id
    console.log(`─── Commande #${displayId} (${order.email}) ───────────────────`)
    console.log()

    // --- Module Order (comme les emails le voient) ---
    console.log(`  📧 VIA MODULE ORDER (ce que l'email reçoit) :`)
    console.log(`    shipping_total   = ${order.shipping_total}   (${typeof order.shipping_total})`)
    console.log(`    discount_total   = ${order.discount_total}   (${typeof order.discount_total})`)
    console.log(`    gift_card_total  = ${order.gift_card_total}  (${typeof order.gift_card_total})`)
    console.log(`    total            = ${order.total}            (${typeof order.total})`)
    console.log(`    subtotal         = ${order.subtotal}         (${typeof order.subtotal})`)
    console.log(`    tax_total        = ${order.tax_total}        (${typeof order.tax_total})`)
    console.log(`    item_total       = ${order.item_total}       (${typeof order.item_total})`)
    console.log()

    // --- Tenter Query (plus proche de l'API Store) ---
    try {
      const { data: [queryOrder] } = await query.graph({
        entity: "order",
        filters: { id: order.id },
        fields: [
          "id",
          "display_id",
          "total",
          "subtotal",
          "tax_total",
          "shipping_total",
          "discount_total",
          "gift_card_total",
          "item_total",
          "item_tax_total",
          "original_total",
          "original_subtotal",
          "original_tax_total",
          "shipping_subtotal",
          "shipping_tax_total",
          "discount_subtotal",
          "discount_tax_total",
          "currency_code",
          "summary.*",
          "items.*",
          "shipping_methods.*",
        ],
      })

      if (queryOrder) {
        console.log(`  🌐 VIA QUERY GRAPH (proche API Store, ce que la page reçoit) :`)
        console.log(`    total            = ${queryOrder.total}            (${typeof queryOrder.total})`)
        console.log(`    subtotal         = ${queryOrder.subtotal}         (${typeof queryOrder.subtotal})`)
        console.log(`    tax_total        = ${queryOrder.tax_total}        (${typeof queryOrder.tax_total})`)
        console.log(`    shipping_total   = ${queryOrder.shipping_total}   (${typeof queryOrder.shipping_total})`)
        console.log(`    discount_total   = ${queryOrder.discount_total}   (${typeof queryOrder.discount_total})`)
        console.log(`    gift_card_total  = ${queryOrder.gift_card_total}  (${typeof queryOrder.gift_card_total})`)
        console.log(`    item_total       = ${queryOrder.item_total}       (${typeof queryOrder.item_total})`)
        console.log(`    item_tax_total   = ${queryOrder.item_tax_total}   (${typeof queryOrder.item_tax_total})`)
        console.log(`    original_total   = ${queryOrder.original_total}   (${typeof queryOrder.original_total})`)
        console.log(`    shipping_subtotal= ${queryOrder.shipping_subtotal}(${typeof queryOrder.shipping_subtotal})`)
        console.log()

        // Simuler CartTotals
        const shippingEuros = queryOrder.shipping_total ?? 0
        const discountEuros = queryOrder.discount_total ?? 0

        console.log(`  🖥️  CE QUE CartTotals AFFICHERAIT :`)

        if (queryOrder.shipping_total != null && queryOrder.shipping_total !== undefined) {
          console.log(`    Livraison : ${Number(shippingEuros).toFixed(2).replace('.', ',')} €  ✅`)
        } else {
          console.log(`    Livraison : "Calculé à l'étape suivante" ❌ (shipping_total est null/undefined !)`)
        }

        if (discountEuros > 0) {
          console.log(`    Réduction : -${Number(discountEuros).toFixed(2).replace('.', ',')} €`)
        }

        // Shipping methods pour comparaison
        const shippingMethodTotal = (queryOrder.shipping_methods || []).reduce(
          (sum: number, m: any) => sum + (Number(m.amount) || 0), 0
        )
        console.log()
        console.log(`    shipping_methods total = ${shippingMethodTotal}`)
        if (shippingMethodTotal > 0 && (queryOrder.shipping_total == null || queryOrder.shipping_total === undefined)) {
          console.log(`    🚨 BUG PAGE : shipping_total manquant mais shipping_methods = ${shippingMethodTotal} €`)
        } else if (shippingMethodTotal > 0) {
          console.log(`    ✅ shipping_total (${queryOrder.shipping_total}) correspond aux shipping_methods (${shippingMethodTotal})`)
        }
      }
    } catch (e: any) {
      console.log(`  ⚠️ Query graph non disponible: ${e.message}`)

      // Fallback: tester via HTTP Store API
      console.log(`  Tentative via Store API HTTP...`)
      try {
        const backendUrl = process.env.RAILWAY_PUBLIC_DOMAIN_VALUE || "http://localhost:9000"
        const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
        const url = `${backendUrl}/store/orders/${order.id}`

        const res = await fetch(url, {
          headers: {
            "x-publishable-api-key": publishableKey,
          },
        })

        if (res.ok) {
          const { order: storeOrder } = await res.json()
          console.log(`  🌐 VIA STORE API HTTP :`)
          console.log(`    total            = ${storeOrder?.total}`)
          console.log(`    shipping_total   = ${storeOrder?.shipping_total}`)
          console.log(`    discount_total   = ${storeOrder?.discount_total}`)
        } else {
          console.log(`    HTTP ${res.status}: ${await res.text().then(t => t.substring(0, 100))}`)
        }
      } catch (e2: any) {
        console.log(`    Erreur HTTP: ${e2.message}`)
      }
    }

    console.log()
    console.log()
  }

  console.log(`${"=".repeat(80)}`)
  console.log(`  FIN DU DIAGNOSTIC`)
  console.log(`${"=".repeat(80)}\n`)
}
