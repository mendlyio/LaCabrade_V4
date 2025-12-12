import { Modules } from '@medusajs/framework/utils'
import { IOrderModuleService, IFulfillmentModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { BPOST_MODULE } from '../modules/bpost'
import BpostModuleService from '../modules/bpost/service'

/**
 * Subscriber qui crée automatiquement le shipment Bpost et génère l'étiquette
 * quand un fulfillment est créé avec le provider Bpost
 */
export default async function bpostCreateShipmentHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  const fulfillmentModuleService: IFulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const bpostService: BpostModuleService = container.resolve(BPOST_MODULE)
  
  try {
    const fulfillmentId = data.id
    
    // Récupérer le fulfillment
    const fulfillment = await fulfillmentModuleService.retrieveFulfillment(fulfillmentId, {
      relations: ['items']
    })
    
    // Vérifier si c'est un fulfillment Bpost
    const providerId = (fulfillment as any).provider_id
    if (!providerId || !providerId.includes('bpost')) {
      console.log(`[BpostShipment] Fulfillment ${fulfillmentId} n'est pas Bpost (provider: ${providerId})`)
      return
    }
    
    console.log(`[BpostShipment] Création shipment Bpost pour fulfillment ${fulfillmentId}`)
    
    // Récupérer la commande
    const orderId = (fulfillment as any).order_id
    if (!orderId) {
      console.warn('[BpostShipment] Fulfillment sans order_id')
      return
    }
    
    const order = await orderModuleService.retrieveOrder(orderId, {
      relations: ['shipping_address', 'items']
    })
    
    // Récupérer l'adresse de livraison
    const shippingAddress = await (orderModuleService as any).orderAddressService_.retrieve(
      order.shipping_address.id
    )
    
    // Récupérer le point relais Bpost depuis les métadonnées de la commande
    const pickupPoint = (order.metadata as any)?.bpost_pickup_point
    const pickupPointId = pickupPoint?.Id || pickupPoint?.PointId
    
    // Poids forfaitaire (pas de calcul basé sur les produits)
    // Bpost recommande 1000g (1kg) pour un colis standard
    const totalWeightGrams = 1000 // 1kg forfaitaire
    
    // Créer le shipment Bpost
    const shipmentResult = await bpostService.createShipment({
      orderId: order.id,
      recipient: {
        name: `${shippingAddress.first_name} ${shippingAddress.last_name}`,
        email: order.email,
        phone: shippingAddress.phone || '',
        address: {
          address_1: shippingAddress.address_1,
          address_2: shippingAddress.address_2,
          postal_code: shippingAddress.postal_code,
          city: shippingAddress.city,
          country_code: shippingAddress.country_code,
        }
      },
      pickupPointId,
      weightGrams: totalWeightGrams,
      reference: (order as any).display_id || order.id,
    })
    
    console.log(`[BpostShipment] ✅ Shipment créé:`, shipmentResult.shipmentId)
    
    // Générer l'étiquette
    let labelUrl = ''
    try {
      const labelResult = await bpostService.getLabel(shipmentResult.shipmentId)
      labelUrl = labelResult.labelUrl
      console.log(`[BpostShipment] ✅ Étiquette générée:`, labelUrl)
    } catch (labelError) {
      console.error('[BpostShipment] ⚠️ Erreur génération étiquette:', labelError)
    }
    
    // Construire l'URL de tracking publique Bpost
    const publicTrackingUrl = shipmentResult.trackingNumber
      ? `https://track.bpost.be/btr/web/#/search?itemCode=${shipmentResult.trackingNumber}&lang=fr&postalCode=${shippingAddress.postal_code}`
      : ''
    
    // Mettre à jour le fulfillment avec les infos de tracking
    // Format compatible avec order-shipped.tsx
    await fulfillmentModuleService.updateFulfillment(fulfillmentId, {
      data: {
        // Données Bpost spécifiques
        bpost_shipment_id: shipmentResult.shipmentId,
        bpost_tracking_number: shipmentResult.trackingNumber,
        bpost_label_url: labelUrl,
        bpost_pickup_point: pickupPoint,
        
        // Données standardisées pour le template email
        public_tracking_url: publicTrackingUrl,
        label_url: labelUrl,
      },
      // Ajouter le tracking number au tableau tracking_numbers pour compatibilité
      tracking_numbers: shipmentResult.trackingNumber ? [shipmentResult.trackingNumber] : [],
    })
    
    console.log(`[BpostShipment] ✅ Fulfillment ${fulfillmentId} mis à jour avec tracking:`, shipmentResult.trackingNumber)
    console.log(`[BpostShipment] ✅ Email de suivi sera envoyé avec URL:`, publicTrackingUrl)
    
  } catch (error) {
    console.error('[BpostShipment] ❌ Erreur création shipment:', error)
    // Ne pas bloquer le processus en cas d'erreur Bpost
  }
}

export const config: SubscriberConfig = {
  event: 'fulfillment.created'
}

