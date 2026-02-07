"use client"

import { CheckCircleSolid } from "@medusajs/icons"
import { Heading, Text, useToggleState } from "@medusajs/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import Divider from "@modules/common/components/divider"
import Spinner from "@modules/common/icons/spinner"

import { setAddresses } from "@lib/data/cart"
import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"
import { useFormState } from "react-dom"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import { SubmitButton } from "../submit-button"

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "address"

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  const [message, formAction] = useFormState(setAddresses, null)

  return (
    <div className="bg-white">
      {/* Step header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            !isOpen && cart?.shipping_address
              ? "bg-green-100 text-green-600"
              : isOpen
                ? "bg-amber-600 text-white"
                : "bg-gray-100 text-gray-400"
          }`}>
            {!isOpen && cart?.shipping_address ? (
              <CheckCircleSolid className="w-5 h-5" />
            ) : (
              "1"
            )}
          </div>
          <div>
            <Heading
              level="h2"
              className="text-base font-bold text-gray-900"
            >
              Adresse de livraison
            </Heading>
            {!isOpen && cart?.shipping_address && (
              <p className="text-xs text-gray-500 mt-0.5">Étape complétée</p>
            )}
          </div>
        </div>
        {!isOpen && cart?.shipping_address && (
          <button
            onClick={handleEdit}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
            data-testid="edit-address-button"
          >
            Modifier
          </button>
        )}
      </div>

      {isOpen ? (
        <form action={formAction}>
          <div className="pb-6">
            <ShippingAddress
              customer={customer}
              checked={sameAsBilling}
              onChange={toggleSameAsBilling}
              cart={cart}
            />

            {!sameAsBilling && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <Heading
                    level="h2"
                    className="text-base font-bold text-gray-900"
                  >
                    Adresse de facturation
                  </Heading>
                </div>
                <BillingAddress cart={cart} />
              </div>
            )}
            <SubmitButton
              className="mt-6 w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              data-testid="submit-address-button"
            >
              Continuer vers la livraison
            </SubmitButton>
            <ErrorMessage error={message} data-testid="address-error-message" />
          </div>
        </form>
      ) : (
        <div>
          {cart && cart.shipping_address ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                className="bg-gray-50 rounded-lg p-4"
                data-testid="shipping-address-summary"
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Livraison
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {cart.shipping_address.first_name}{" "}
                  {cart.shipping_address.last_name}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {cart.shipping_address.address_1}
                  {cart.shipping_address.address_2 && `, ${cart.shipping_address.address_2}`}
                </p>
                <p className="text-sm text-gray-600">
                  {cart.shipping_address.postal_code}{" "}
                  {cart.shipping_address.city}
                </p>
                <p className="text-sm text-gray-600">
                  {cart.shipping_address.country_code?.toUpperCase()}
                </p>
              </div>

              <div
                className="bg-gray-50 rounded-lg p-4"
                data-testid="shipping-contact-summary"
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Contact
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {cart.shipping_address.phone || "—"}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {cart.email}
                </p>
              </div>

              <div
                className="bg-gray-50 rounded-lg p-4"
                data-testid="billing-address-summary"
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Facturation
                </p>
                {sameAsBilling ? (
                  <p className="text-sm text-gray-500 italic">
                    Identique à la livraison
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900">
                      {cart.billing_address?.first_name}{" "}
                      {cart.billing_address?.last_name}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {cart.billing_address?.address_1}
                      {cart.billing_address?.address_2 && `, ${cart.billing_address.address_2}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {cart.billing_address?.postal_code}{" "}
                      {cart.billing_address?.city}
                    </p>
                    <p className="text-sm text-gray-600">
                      {cart.billing_address?.country_code?.toUpperCase()}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <Spinner />
            </div>
          )}
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Addresses
