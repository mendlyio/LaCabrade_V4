import { Heading } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"

const CheckoutSummary = ({ cart, customer }: { cart: any; customer?: HttpTypes.StoreCustomer | null }) => {
  const itemCount = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0
  
  return (
    <div className="sticky top-0 flex flex-col-reverse small:flex-col gap-y-8 py-8 small:py-0">
      <div className="w-full bg-white flex flex-col">
        {/* En-tête du récapitulatif */}
        <div className="bg-amber-600 p-6 rounded-t-xl -mt-8 -mx-6 mb-6 small:mt-0 small:mx-0 small:rounded-t-none">
          <Heading
            level="h2"
            className="text-xl font-bold text-gray-900 flex items-center gap-2"
          >
            <span className="w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {itemCount}
            </span>
            Récapitulatif de la commande
          </Heading>
        </div>

        {/* Totaux */}
        <div className="px-6 mb-6">
          <CartTotals totals={cart} />
        </div>

        <Divider className="my-2" />

        {/* Articles */}
        <div className="px-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📦 Articles ({itemCount})
          </h3>
          <ItemsPreviewTemplate items={cart?.items} />
        </div>

        {/* Code promo */}
        <div className="px-6 pb-6">
          <DiscountCode cart={cart} customer={customer} />
        </div>
      </div>
    </div>
  )
}

export default CheckoutSummary
