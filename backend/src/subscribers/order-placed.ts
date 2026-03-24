import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService, IProductModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { ODOO_MODULE } from '../modules/odoo'
import OdooModuleService from '../modules/odoo/service'
import { getOrderDisplayTotalEuros } from '../utils/order-display-total'
import { STORE_URL } from '../lib/constants'

export default async function customOrderPlacedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  
  const order = await orderModuleService.retrieveOrder(data.id, { 
    relations: ['items', 'items.adjustments', 'summary', 'shipping_address', 'shipping_methods', 'shipping_methods.adjustments'] 
  })
  
  // Récupération sécurisée de l'adresse (peut échouer si shipping_address est null, bien que rare sur order.placed)
  let shippingAddress
  try {
    if (order.shipping_address?.id) {
      shippingAddress = await (orderModuleService as any).orderAddressService_.retrieve(order.shipping_address.id)
    }
  } catch (e) {
    console.warn('⚠️ Impossible de récupérer l\'adresse complète:', e)
    shippingAddress = order.shipping_address
  }

  // 1. Envoyer l'email de confirmation
  try {
    const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)

    // Livraison effective = somme des montants bruts + ajustements (promos livraison gratuite = ajustement négatif)
    const shippingTotal = (order.shipping_methods || []).reduce((acc: number, m: any) => {
      const raw = Number(m.amount) || 0
      const adj = (m.adjustments || []).reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
      return acc + Math.max(0, raw + adj)
    }, 0)

    const displayTotal = getOrderDisplayTotalEuros({
      ...order,
      shipping_total: shippingTotal,
      shipping_address: shippingAddress || order.shipping_address,
    } as any)

    // Récupérer 2 produits suggérés (cross-sell)
    let suggestedProducts: Array<{ title: string; thumbnail: string; url: string }> = []
    try {
      const productModuleService: IProductModuleService = container.resolve(Modules.PRODUCT)
      const orderedProductIds = new Set(
        order.items.map((i: any) => i.product_id).filter(Boolean)
      )
      const products = await productModuleService.listProducts(
        {},
        { take: 40, select: ['id', 'title', 'handle', 'thumbnail'] }
      )
      suggestedProducts = products
        .filter((p) => !orderedProductIds.has(p.id) && p.thumbnail)
        .sort(() => 0.5 - Math.random())
        .slice(0, 2)
        .map((p) => ({
          title: p.title,
          thumbnail: p.thumbnail!,
          url: `${STORE_URL}/products/${p.handle}`,
        }))
    } catch (e: any) {
      console.warn('⚠️ Could not fetch suggested products for email:', e?.message)
    }

    const orderData = {
      emailOptions: {
        replyTo: 'contact@sellerie-lacabrade.be',
        subject: `Confirmation de votre commande #${(order as any).display_id || order.id}`
      },
      order: {
        ...order,
        display_id: (order as any).display_id || order.id,
        display_total: displayTotal
      },
      shippingAddress,
      suggestedProducts,
      preview: 'Merci pour votre commande !'
    }

    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      template: EmailTemplates.ORDER_PLACED,
      data: orderData
    })

    const ownerNotifData = {
      ...orderData,
      suggestedProducts: [],
      emailOptions: {
        ...orderData.emailOptions,
        subject: `[La Cabrade] Nouvelle commande #${(order as any).display_id || order.id}`
      }
    }

    await notificationModuleService.createNotifications({
      to: 'contact@sellerie-lacabrade.be',
      channel: 'email',
      template: EmailTemplates.ORDER_PLACED,
      data: ownerNotifData
    })

    await notificationModuleService.createNotifications({
      to: 'welcome@mendly.io',
      channel: 'email',
      template: EmailTemplates.ORDER_PLACED,
      data: ownerNotifData
    })
    
    console.log(`✅ Order confirmation email sent for order ${order.id} (client + contact@sellerie-lacabrade.be + welcome@mendly.io)`)
  } catch (error: any) {
    console.error('❌ Error sending order confirmation notification:', error?.message ?? error)
    if (error?.code === 'MODULE_NOT_FOUND' || error?.message?.includes('NOTIFICATION')) {
      console.warn('💡 Vérifiez que RESEND_API_KEY et RESEND_FROM_EMAIL sont définis en production (Railway).')
    }
  }

  // 2. Synchroniser avec Odoo
  try {
    let odooService: OdooModuleService
    try {
      odooService = container.resolve(ODOO_MODULE)
    } catch (e: any) {
      console.log(`ℹ️ Module Odoo non configuré (resolve "${ODOO_MODULE}" échoué: ${e?.message}). Pas de sync commande.`)
      return
    }

    if (!odooService) {
      console.warn('⚠️ odooService résolu mais null/undefined. Pas de sync commande.')
      return
    }

    console.log(`🔄 [ODOO SYNC] Début sync commande ${(order as any).display_id || order.id} (${order.email}) vers Odoo...`)

    const allItems = order.items.map((item) => ({
      sku: item.variant_sku || '',
      quantity: item.quantity,
      price: item.unit_price,
      name: item.title,
      isGiftCard: !!(
        (item.metadata as any)?.is_gift_card ||
        String(item.product_title || item.title || "").toLowerCase().includes("bon cadeau") ||
        (item.variant_sku || "").startsWith("GC-")
      ),
    }))

    const items = allItems.filter(i => i.sku)

    const shippingCost = order.shipping_methods?.reduce((acc, method) => acc + (Number(method.amount) || 0), 0) || 0

    // Adjustments Medusa v2 tax-inclusive sont en HT ; convertir en TTC
    // pour cohérence avec les unit_price (TTC) envoyés à Odoo
    const VAT_RATE = 0.21
    let totalItemDiscountHT = 0
    for (const item of order.items) {
      for (const adj of (item as any).adjustments || []) {
        totalItemDiscountHT += Math.abs(Number(adj.amount || 0))
      }
    }
    const totalItemDiscount = Math.round(totalItemDiscountHT * (1 + VAT_RATE) * 100) / 100

    console.log(
      `💰 [ODOO SYNC] Commande #${(order as any).display_id || order.id}\n` +
      `   Total items: ${allItems.length}, avec SKU: ${items.length}, sans SKU: ${allItems.length - items.length}\n` +
      `   Items sans SKU: ${allItems.filter(i => !i.sku).map(i => `"${i.name}"`).join(', ') || '(aucun)'}\n` +
      `   order.total = ${order.total}\n` +
      `   Premier item: unit_price=${order.items[0]?.unit_price}, qty=${order.items[0]?.quantity}, sku="${order.items[0]?.variant_sku}", title="${order.items[0]?.title}"\n` +
      `   shippingCost = ${shippingCost}, totalItemDiscount = ${totalItemDiscount}\n` +
      `   Items → Odoo: ${JSON.stringify(items.map(i => ({ sku: i.sku, price: i.price, qty: i.quantity, isGC: i.isGiftCard })))}`
    )

    if (items.length === 0) {
      console.error(`❌ [ODOO SYNC] Commande ${order.id} : AUCUN item avec SKU ! Sync Odoo impossible.`)
      console.error(`   Tous les items: ${JSON.stringify(allItems.map(i => ({ sku: i.sku || '(vide)', name: i.name })))}`)
      return
    }

    const vatNumber = (order.metadata as any)?.vat_number || null
    const companyName = shippingAddress?.company || null

    if (vatNumber) {
      console.log(`🏢 Commande avec TVA intracommunautaire: ${vatNumber} (société: ${companyName || 'N/A'})`)
    }

    const odooOrderId = await odooService.createOrder({
      customerEmail: order.email,
      customerName: shippingAddress ? `${shippingAddress.first_name} ${shippingAddress.last_name}` : 'Client Web',
      items: items,
      shippingCost: shippingCost,
      discountTotal: totalItemDiscount,
      total: (order.summary as any)?.total || order.total || 0,
      shippingAddress: shippingAddress ? {
        address_1: shippingAddress.address_1,
        city: shippingAddress.city,
        postal_code: shippingAddress.postal_code,
        country_code: shippingAddress.country_code
      } : undefined,
      companyName: companyName || undefined,
      vatNumber: vatNumber || undefined,
    })
    console.log(`✅ [ODOO SYNC] Commande sync OK ! Odoo sale.order ID: ${odooOrderId}`)
  } catch (error: any) {
    console.error(`❌ [ODOO SYNC] Erreur sync commande ${order.id} vers Odoo:`)
    console.error(`   Message: ${error?.message}`)
    console.error(`   Data: ${JSON.stringify(error?.data || error?.response || '(none)')}`)
    if (error?.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(0, 5).join('\n   ')}`)
    }
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
