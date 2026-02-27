import { sdk } from "@lib/config"
import { cache } from "react"

// Shipping actions
export const listCartShippingMethods = cache(async function (cartId: string) {
  try {
    const { shipping_options } = await sdk.store.fulfillment.listCartOptions(
      { cart_id: cartId },
      { next: { tags: ["shipping"] } }
    )
    return shipping_options ?? null
  } catch (err: any) {
    console.error("[listCartShippingMethods]", err?.message ?? err)
    return null
  }
})
