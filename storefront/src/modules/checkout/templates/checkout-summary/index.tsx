import { HttpTypes } from "@medusajs/types"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"

const CheckoutSummary = ({ cart, customer }: { cart: any; customer?: HttpTypes.StoreCustomer | null }) => {
  const itemCount = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0
  
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center justify-between">
          Récapitulatif
          <span className="text-xs font-normal normal-case tracking-normal text-gray-500">
            {itemCount} article{itemCount > 1 ? "s" : ""}
          </span>
        </h2>
      </div>

      {/* Articles */}
      <div className="p-5 border-b border-gray-100">
        <ItemsPreviewTemplate items={cart?.items} />
      </div>

      {/* Code promo */}
      <div className="p-5 border-b border-gray-100">
        <DiscountCode cart={cart} customer={customer} />
      </div>

      {/* Totaux */}
      <div className="p-5">
        <CartTotals totals={cart} />
      </div>
    </div>
  )
}

export default CheckoutSummary
