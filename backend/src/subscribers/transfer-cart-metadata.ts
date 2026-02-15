import { Modules } from '@medusajs/framework/utils'
import { IOrderModuleService, ICartModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'

/**
 * Subscriber qui transfère les métadonnées du panier vers la commande
 * (notamment bpost_pickup_point pour Bpost et gift card metadata)
 */
export default async function transferCartMetadataHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  const cartModuleService: ICartModuleService = container.resolve(Modules.CART)
  
  try {
    const orderId = data.id
    
    // Récupérer la commande avec les items
    const order = await orderModuleService.retrieveOrder(orderId, {
      relations: ['items']
    })
    
    // Récupérer le cart_id depuis order.metadata (Medusa le sauvegarde automatiquement)
    const cartId = (order as any).cart_id
    
    if (!cartId) {
      console.log(`[TransferMetadata] Pas de cart_id pour order ${orderId}`)
      return
    }
    
    // Récupérer le panier avec ses items
    const cart = await cartModuleService.retrieveCart(cartId, {
      select: ['metadata'],
      relations: ['items']
    })
    
    // --- Transfert des métadonnées au niveau du panier ---
    const metadataToTransfer: any = {}
    
    if (cart.metadata) {
      if (cart.metadata.bpost_pickup_point) {
        metadataToTransfer.bpost_pickup_point = cart.metadata.bpost_pickup_point
        console.log(`[TransferMetadata] ✅ Point relais Bpost transféré vers order ${orderId}`)
      }

      if (cart.metadata.pickup_location) {
        metadataToTransfer.pickup_location = cart.metadata.pickup_location
        const loc = cart.metadata.pickup_location as any
        console.log(`[TransferMetadata] ✅ Retrait en magasin transféré vers order ${orderId}: ${loc.name || loc.id}`)
      }

      if (cart.metadata.vat_number) {
        metadataToTransfer.vat_number = cart.metadata.vat_number
        console.log(`[TransferMetadata] ✅ Numéro de TVA transféré vers order ${orderId}: ${cart.metadata.vat_number}`)
      }
    }
    
    // Mettre à jour la commande si on a des métadonnées à transférer
    if (Object.keys(metadataToTransfer).length > 0) {
      await orderModuleService.updateOrders([{
        id: orderId,
        metadata: {
          ...order.metadata,
          ...metadataToTransfer
        }
      }])
      
      console.log(`[TransferMetadata] ✅ Métadonnées transférées:`, Object.keys(metadataToTransfer))
    }

    // --- Vérification des métadonnées gift card sur les line items ---
    // En Medusa v2, les metadata des line items du cart sont normalement préservées
    // sur les order items. On log juste pour confirmer.
    const giftCardItems = order.items?.filter(
      (item: any) => item.metadata?.is_gift_card === true
    ) || []

    if (giftCardItems.length > 0) {
      console.log(
        `[TransferMetadata] 🎁 ${giftCardItems.length} bon(s) cadeau(x) détecté(s) dans order ${orderId}:`,
        giftCardItems.map((item: any) => ({
          recipient: item.metadata?.recipient_email,
          name: item.metadata?.recipient_name,
        }))
      )
    }
    
  } catch (error) {
    console.error('[TransferMetadata] ❌ Erreur:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}

