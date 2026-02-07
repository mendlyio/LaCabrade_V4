import { Metadata } from "next"
import CartTemplateModern from "@modules/cart/templates/cart-template-modern"

import { enrichLineItems, retrieveCart } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { getCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Panier | La Cabrade",
  description: "Consultez et gérez les articles de votre panier",
}

const fetchCart = async () => {
  try {
    const cart = await retrieveCart()

    if (!cart) {
      return null
    }

    if (cart?.items?.length) {
      const enrichedItems = await enrichLineItems(cart?.items, cart?.region_id!)
      cart.items = enrichedItems as HttpTypes.StoreCartLineItem[]
    }

    return cart
  } catch (error) {
    console.error("Erreur lors de la récupération du panier:", error)
    return null
  }
}

type Props = {
  params: { countryCode: string }
}

export default async function Cart({ params }: Props) {
  const cart = await fetchCart()
  const customer = await getCustomer().catch(() => null)
  const { countryCode } = params

  return <CartTemplateModern cart={cart} customer={customer} countryCode={countryCode} />
}
