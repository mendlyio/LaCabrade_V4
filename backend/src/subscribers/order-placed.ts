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
    // Vérifier si le module Odoo est actif
    let odooService: OdooModuleService
    try {
      odooService = container.resolve(ODOO_MODULE)
    } catch (e) {
      console.log('ℹ️ Module Odoo non configuré, pas de sync commande.')
      return
    }

    if (odooService) {
      console.log(`🔄 Syncing order ${order.id} to Odoo...`)
      
      const items = order.items.map((item) => ({
        sku: item.variant_sku || '',
        quantity: item.quantity,
        price: item.unit_price,
        name: item.title,
        isGiftCard: !!(
          (item.metadata as any)?.is_gift_card ||
          String(item.product_title || item.title || "").toLowerCase().includes("bon cadeau") ||
          (item.variant_sku || "").startsWith("GC-")
        ),
      })).filter(i => i.sku)

      // Calcul du coût de livraison
      const shippingCost = order.shipping_methods?.reduce((acc, method) => acc + (Number(method.amount) || 0), 0) || 0

      // Calcul des réductions (item-level adjustments = promos appliquées aux articles)
      let totalItemDiscount = 0
      for (const item of order.items) {
        for (const adj of (item as any).adjustments || []) {
          totalItemDiscount += Math.abs(Number(adj.amount || 0))
        }
      }

      // LOG DIAGNOSTIC : vérifier les unités des montants Medusa
      console.log(
        `💰 [ODOO SYNC DIAGNOSTIC] Commande ${(order as any).display_id || order.id}\n` +
        `   order.total = ${order.total}\n` +
        `   order.summary.total = ${(order.summary as any)?.total}\n` +
        `   order.summary.original_order_total = ${(order.summary as any)?.original_order_total}\n` +
        `   Premier item: unit_price = ${order.items[0]?.unit_price}, qty = ${order.items[0]?.quantity}, title = "${order.items[0]?.title}"\n` +
        `   Shipping methods: ${JSON.stringify(order.shipping_methods?.map((m: any) => ({ name: m.name, amount: m.amount })))}\n` +
        `   shippingCost calculé = ${shippingCost}\n` +
        `   totalItemDiscount (adjustments) = ${totalItemDiscount}\n` +
        `   Items envoyés à Odoo: ${JSON.stringify(items.map(i => ({ sku: i.sku, price: i.price, isGC: i.isGiftCard })))}`
      )

      if (items.length > 0) {
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
        console.log(`✅ Order synced to Odoo successfully! Odoo ID: ${odooOrderId}`)
      } else {
        console.warn(`⚠️ Order ${order.id} has no items with SKU, skipping Odoo sync.`)
      }
    }
  } catch (error: any) {
    console.error('❌ Error syncing order to Odoo:', error.message)
    // On ne throw pas pour ne pas bloquer le flow Medusa, mais on log l'erreur
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
