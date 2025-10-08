import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

type BpostPricingRule = {
  country_code: string
  mode: "home" | "pickup"
  min_weight_g?: number
  max_weight_g?: number
  amount: number
  currency_code: string
}

type CalculateContext = {
  cart?: any
  option?: any
}

// Provider minimal pour prix calculé: lit des règles depuis metadata de l'option
export default class BpostFulfillmentProviderService {
  static identifier = "bpost"

  private container: MedusaContainer

  constructor(container: MedusaContainer) {
    this.container = container
  }

  async calculatePrice(optionData: any, data: any, context: CalculateContext): Promise<number> {
    const cart = context?.cart
    const shippingOption = context?.option || optionData

    const country = cart?.shipping_address?.country_code?.toUpperCase?.() || "BE"
    const totalWeight = (cart?.items || []).reduce((sum: number, it: any) => {
      const weight = (it?.variant?.weight || it?.weight || 0) * (it?.quantity || 1)
      return sum + (Number.isFinite(weight) ? weight : 0)
    }, 0)

    const metadata = shippingOption?.metadata || {}
    const mode: "home" | "pickup" = (metadata?.mode === "pickup" ? "pickup" : "home")

    const rules: BpostPricingRule[] = Array.isArray(metadata?.bpost_pricing_rules)
      ? metadata.bpost_pricing_rules
      : []

    // Cherche une règle qui correspond au pays, mode et plage de poids
    const matched = rules.find((r) => {
      if (r.country_code?.toUpperCase() !== country) return false
      if ((r.mode || "home") !== mode) return false
      const min = r.min_weight_g ?? 0
      const max = r.max_weight_g ?? Number.MAX_SAFE_INTEGER
      return totalWeight >= min && totalWeight <= max
    })

    if (matched) {
      return matched.amount
    }

    // Fallback: montant fixe par mode si défini
    const fallbackAmount = Number(metadata?.bpost_amount ?? 0)
    return isNaN(fallbackAmount) ? 0 : fallbackAmount
  }

  // Hooks de création d'expédition: délègue au module Bpost existant
  async createFulfillment(data: any): Promise<any> {
    const bpost = this.container.resolve("bpost") as any
    const orderService = this.container.resolve(Modules.ORDER)
    const order = await orderService.retrieveOrder(data?.order_id)

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

    return {
      tracking_links: result?.trackingNumber ? [result.trackingNumber] : [],
      labels: result?.labelUrl ? [result.labelUrl] : [],
      data: result,
    }
  }
}


