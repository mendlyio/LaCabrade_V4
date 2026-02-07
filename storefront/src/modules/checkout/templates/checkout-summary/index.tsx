import { HttpTypes } from "@medusajs/types"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"

const CheckoutSummary = ({ cart, customer }: { cart: any; customer?: HttpTypes.StoreCustomer | null }) => {
  const itemCount = cart?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0
  
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          Récapitulatif
          <span className="ml-auto text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
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
