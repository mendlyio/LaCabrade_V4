import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

// Provider Bpost pour livraison avec prix fixe
export default class BpostFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "bpost"

  private container: MedusaContainer
  private options?: Record<string, any>

  constructor(container: MedusaContainer, options?: Record<string, any>) {
    // La classe parente n'attend pas d'arguments
    super()
    this.container = container
    this.options = options
  }

  async getFulfillmentOptions(): Promise<any[]> {
    return [
      {
        id: "bpost-home",
        name: "Bpost — Livraison à domicile",
        is_calculated: true,
      },
      {
        id: "bpost-pickup",
        name: "Bpost — Point relais",
        is_calculated: true,
      },
    ]
  }

  async validateFulfillmentData(
    optionData: any,
    data: any,
    context: any
  ): Promise<any> {
    return data
  }

  async validateOption(data: any): Promise<boolean> {
    return true
  }

  async canCalculate(data: any): Promise<boolean> {
    return true
  }

  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: any
  ): Promise<any> {
    const shippingOption = context?.option || optionData
    
    // Lire depuis data (stocké lors de la création) ou metadata
    const optData = (shippingOption as any)?.data || {}
    const metadata = (shippingOption as any)?.metadata || {}
    
    // Prix fixe depuis data.bpost_amount ou metadata.bpost_amount
    const calculatedAmount = Number(optData?.bpost_amount ?? metadata?.bpost_amount ?? 0) || 0

    // Retourne un objet CalculatedShippingOptionPrice
    return {
      calculated_amount: calculatedAmount,
      is_calculated_price_tax_inclusive: false,
    }
  }

  // Hooks de création d'expédition: délègue au module Bpost existant
  async createFulfillment(data: any, items: any, order: any, fulfillment: any): Promise<any> {
    try {
      const bpost = this.container.resolve("bpost") as any

      const pickupFromMetadata = (order?.metadata as any)?.bpost_pickup_point
      const pickupPointId = data?.pickup_point_id || pickupFromMetadata?.Id || pickupFromMetadata?.id

      const result = await bpost.createShipment({
        orderId: order.id,
        recipient: {
          name: `${order.shipping_address?.first_name || ""} ${order.shipping_address?.last_name || ""}`.trim(),
          email: order.email,
          phone: order.shipping_address?.phone,
          address: {
            address_1: order.shipping_address?.address_1 || "",
            address_2: order.shipping_address?.address_2 || "",
            postal_code: order.shipping_address?.postal_code || "",
            city: order.shipping_address?.city || "",
            country_code: order.shipping_address?.country_code || "BE",
          },
        },
        pickupPointId,
        weightGrams: undefined,
        reference: data?.reference || order?.id,
      })

      // Récupérer l'étiquette immédiatement après la création
      let labelUrl = ""
      try {
        if (result.shipmentId) {
            const labelResult = await bpost.getLabel(result.shipmentId)
            labelUrl = labelResult.labelUrl
        }
      } catch (e) {
        console.warn("Bpost: Impossible de récupérer l'étiquette immédiatement", e)
      }

      return {
        data: {
            ...result,
            label_url: labelUrl,
            // URL de suivi publique Bpost
            public_tracking_url: result.trackingNumber 
                ? `https://track.bpost.cloud/btr/web/#/search?itemCode=${result.trackingNumber}&lang=fr&postalCode=${order.shipping_address?.postal_code}`
                : undefined
        },
      }
    } catch (error) {
      console.error("Bpost createFulfillment error:", error)
      return {
        data: {},
      }
    }
  }

  async cancelFulfillment(fulfillment: any): Promise<any> {
    // Annulation non implémentée pour l'instant
    return {}
  }

  async createReturnFulfillment(fulfillment: any): Promise<any> {
    // Retours non implémentés pour l'instant
    return {}
  }
}


