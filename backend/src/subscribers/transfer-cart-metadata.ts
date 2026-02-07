import { Modules } from '@medusajs/framework/utils'
import { IOrderModuleService, ICartModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'

/**
 * Subscriber qui transfère les métadonnées du panier vers la commande
 * (notamment bpost_pickup_point pour Bpost)
 */
export default async function transferCartMetadataHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  const cartModuleService: ICartModuleService = container.resolve(Modules.CART)
  
  try {
    const orderId = data.id
    
    // Récupérer la commande
    const order = await orderModuleService.retrieveOrder(orderId)
    
    // Récupérer le cart_id depuis order.metadata (Medusa le sauvegarde automatiquement)
    const cartId = (order as any).cart_id
    
    if (!cartId) {
      console.log(`[TransferMetadata] Pas de cart_id pour order ${orderId}`)
      return
    }
    
    // Récupérer le panier
    const cart = await cartModuleService.retrieveCart(cartId, {
      select: ['metadata']
    })
    
    if (!cart.metadata) {
      console.log(`[TransferMetadata] Pas de metadata dans cart ${cartId}`)
      return
    }
    
    // Transférer les métadonnées intéressantes
    const metadataToTransfer: any = {}
    
    if (cart.metadata.bpost_pickup_point) {
      metadataToTransfer.bpost_pickup_point = cart.metadata.bpost_pickup_point
      console.log(`[TransferMetadata] ✅ Point relais Bpost transféré vers order ${orderId}`)
    }

    if (cart.metadata.vat_number) {
      metadataToTransfer.vat_number = cart.metadata.vat_number
      console.log(`[TransferMetadata] ✅ Numéro de TVA transféré vers order ${orderId}: ${cart.metadata.vat_number}`)
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
    
  } catch (error) {
    console.error('[TransferMetadata] ❌ Erreur:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}

