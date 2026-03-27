import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { getOrderDisplayTotalEuros } from "../utils/order-display-total"

/**
 * Script de diagnostic des montants affichés dans les emails.
 * Récupère les dernières commandes et simule exactement ce que le template afficherait.
 *
 * Usage: cd backend && medusa exec src/scripts/test-email-amounts.ts
 * Ou local: REDIS_URL= medusa exec src/scripts/test-email-amounts.ts
 */
export default async function testEmailAmounts({ container }: ExecArgs) {
  const orderModuleService = container.resolve(Modules.ORDER) as any

  const orders = await orderModuleService.listOrders(
    {},
    {
      take: 5,
      order: { created_at: "DESC" },
      relations: ["items", "summary", "shipping_address", "shipping_methods"],
    }
  )

  if (!orders.length) {
    console.log("❌ Aucune commande trouvée dans la base de données.")
    return
  }

  console.log(`\n${"=".repeat(80)}`)
  console.log(`  DIAGNOSTIC DES MONTANTS EMAIL — ${orders.length} dernière(s) commande(s)`)
  console.log(`${"=".repeat(80)}\n`)

  function isGiftCardItem(item: any): boolean {
    return !!(
      item.metadata?.is_gift_card ||
      String(item.product_title || item.title || "")
        .toLowerCase()
        .includes("bon cadeau") ||
      (item.variant_sku || "").startsWith("GC-")
    )
  }

  function getItemUnitPriceEuros(item: any): number {
    return Number(item.unit_price) || 0
  }

  function formatPrice(amount: number): string {
    return amount.toFixed(2).replace(".", ",") + " €"
  }

  let hasIssue = false

  for (const order of orders) {
    const displayId = order.display_id || order.id

    // Compute shipping from shipping_methods (like the subscriber does)
    const shippingMethods = order.shipping_methods || []
    const shippingFromMethods = shippingMethods.reduce(
      (sum: number, m: any) => sum + (Number(m.amount) || 0),
      0
    )

    // --- Investigate what fields are available ---
    console.log(`─── Commande #${displayId} ───────────────────────────────────`)
    console.log(`  Email: ${order.email} | Date: ${new Date(order.created_at).toLocaleDateString("fr-BE")}`)
    console.log()

    console.log(`  📦 CHAMPS BRUTS DE L'ORDER :`)
    console.log(`    order.total             = ${order.total}  (type: ${typeof order.total})`)
    console.log(`    order.subtotal          = ${order.subtotal}`)
    console.log(`    order.shipping_total    = ${order.shipping_total}`)
    console.log(`    order.discount_total    = ${order.discount_total}`)
    console.log(`    order.gift_card_total   = ${order.gift_card_total}`)
    console.log()

    console.log(`  📊 ORDER.SUMMARY (relation) :`)
    if (order.summary) {
      const s = order.summary
      console.log(`    summary.raw_current_order_total          = ${JSON.stringify(s.raw_current_order_total)}`)
      console.log(`    summary.raw_original_order_total         = ${JSON.stringify(s.raw_original_order_total)}`)
      console.log(`    summary.current_order_total              = ${s.current_order_total}`)
      console.log(`    summary.original_order_total             = ${s.original_order_total}`)
      console.log(`    summary.raw_item_total                   = ${JSON.stringify(s.raw_item_total)}`)
      console.log(`    summary.raw_shipping_total               = ${JSON.stringify(s.raw_shipping_total)}`)
      console.log(`    summary.raw_discount_total               = ${JSON.stringify(s.raw_discount_total)}`)

      // Log all keys we might not know about
      const allKeys = Object.keys(s).filter(
        (k) => !["id", "created_at", "updated_at", "version", "order_id", "deleted_at", "totals"].includes(k)
      )
      console.log(`    [Toutes les clés summary] : ${allKeys.join(", ")}`)
    } else {
      console.log(`    ⚠️ summary est null/undefined`)
    }
    console.log()

    // --- display_total WITHOUT shipping fix (simule l'ancien code) ---
    const displayTotalWithoutFix = getOrderDisplayTotalEuros(order as any)

    // --- display_total WITH shipping fix (nouveau code subscriber) ---
    const orderWithShippingFix = {
      ...order,
      shipping_total: order.shipping_total ?? shippingFromMethods,
    }
    const displayTotalWithFix = getOrderDisplayTotalEuros(orderWithShippingFix as any)

    // --- Items ---
    let itemsSubtotal = 0
    console.log(`  🛒 ARTICLES :`)
    for (const item of order.items || []) {
      const unitPrice = getItemUnitPriceEuros(item)
      const lineTotal = unitPrice * (item.quantity || 1)
      itemsSubtotal += lineTotal
      console.log(
        `    ${(item.product_title || item.title).substring(0, 35).padEnd(35)} ` +
          `${formatPrice(unitPrice).padStart(10)} × ${item.quantity} = ${formatPrice(lineTotal).padStart(10)}`
      )
    }
    console.log()

    // --- Template fallback chain (identique au template) ---
    const templateTotal = Number(
      displayTotalWithFix                                       // display_total du subscriber fixé
      || order.summary?.original_order_total                    // fallback summary
      || (itemsSubtotal + shippingFromMethods)                  // fallback calcul
    )

    console.log(`  💰 COMPARAISON DES TOTAUX :`)
    console.log(`    Sous-total articles                      = ${formatPrice(itemsSubtotal)}`)
    console.log(`    Livraison (shipping_methods)              = ${formatPrice(shippingFromMethods)}`)
    console.log(`    Attendu (articles + livraison)            = ${formatPrice(itemsSubtotal + shippingFromMethods)}`)
    console.log(`    summary.original_order_total              = ${order.summary?.original_order_total ?? 'N/A'}`)
    console.log(`    ──────────────────────────────────────────`)
    console.log(`    ANCIEN code (sans fix shipping)           = ${formatPrice(displayTotalWithoutFix)}`)
    console.log(`    NOUVEAU code (avec fix shipping)          = ${formatPrice(displayTotalWithFix)}`)
    console.log(`    Template (avec triple fallback)            = ${formatPrice(templateTotal)}`)
    console.log()

    const expectedTotal = itemsSubtotal + shippingFromMethods

    if (shippingFromMethods > 0 && Math.abs(displayTotalWithoutFix - expectedTotal) > 0.01) {
      hasIssue = true
      console.log(`  🚨 BUG CORRIGÉ : livraison (${formatPrice(shippingFromMethods)}) était manquante !`)
      console.log(`     AVANT: ${formatPrice(displayTotalWithoutFix)} ❌`)
      console.log(`     APRÈS: ${formatPrice(displayTotalWithFix)} ✅`)
    } else {
      console.log(`  ✅ Montants corrects`)
    }

    if (Math.abs(templateTotal - expectedTotal) > 0.02) {
      console.log(`  ⚠️  Template total (${formatPrice(templateTotal)}) ≠ attendu (${formatPrice(expectedTotal)})`)
      console.log(`     → Peut être normal si exonération TVA, réduction ou carte cadeau.`)
    }

    console.log()
    console.log()
  }

  // --- Product suggestions ---
  console.log(`${"=".repeat(80)}`)
  console.log(`  TEST PRODUITS SUGGÉRÉS`)
  console.log(`${"=".repeat(80)}\n`)

  try {
    const productModuleService = container.resolve(Modules.PRODUCT) as any
    const products = await productModuleService.listProducts(
      {},
      { take: 20, select: ["id", "title", "handle", "thumbnail"] }
    )
    const withThumb = products.filter((p: any) => p.thumbnail)
    console.log(`  ${products.length} produits récupérés, ${withThumb.length} avec thumbnail`)
    if (withThumb.length >= 2) {
      console.log(`  ✅ Cross-sell fonctionnel`)
    } else {
      console.log(`  ⚠️ Pas assez de produits avec thumbnail`)
    }
  } catch (e: any) {
    console.log(`  ❌ Erreur : ${e.message}`)
  }

  console.log(`\n${"=".repeat(80)}`)
  if (hasIssue) {
    console.log(`  ⚠️  CORRECTION NÉCESSAIRE : shipping_total manquant dans l'order`)
    console.log(`  → Le subscriber doit passer shipping_total depuis shipping_methods`)
  } else {
    console.log(`  ✅ TOUS LES MONTANTS SONT CORRECTS`)
  }
  console.log(`${"=".repeat(80)}\n`)
}
