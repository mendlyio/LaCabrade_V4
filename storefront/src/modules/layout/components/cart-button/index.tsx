import CartDropdown from "../cart-dropdown"
import { enrichLineItems, retrieveCart } from "@lib/data/cart"
import { setCartCountSafe } from "@lib/data/cookies"

const fetchCart = async () => {
  const cart = await retrieveCart()

  if (!cart) {
    await setCartCountSafe(0)
    return null
  }

  if (cart?.items?.length) {
    const enrichedItems = await enrichLineItems(cart.items, cart.region_id!)
    cart.items = enrichedItems
  }

  const totalItems =
    cart.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0
  await setCartCountSafe(totalItems)

  return cart
}

export default async function CartButton() {
  const cart = await fetchCart()

  return <CartDropdown cart={cart} />
}
