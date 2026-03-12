"use client"

import { Popover, Transition } from "@headlessui/react"
import { Button } from "@medusajs/ui"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

import {
  getItemsDisplayTotalEuros,
  isIntraCommunityExempt,
} from "@lib/util/cart-amounts"
import { formatAmount } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  // Tous les montants API sont en centimes. Affichage TVAC (TTC) uniforme.
  const itemsDisplayTotal = getItemsDisplayTotalEuros(cartState as any)
  const exempt = isIntraCommunityExempt(cartState as any)
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  // open cart dropdown when modifying the cart items, but only if we're not on the cart page
  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current])

  return (
    <div
      className="h-full z-30"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <Popover.Button className="h-full">
          <LocalizedClientLink
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            href="/cart"
            data-testid="nav-cart-link"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="hidden sm:inline">Panier</span>
            <span className="bg-white text-amber-600 text-xs px-2 py-0.5 rounded-full font-bold min-w-[1.5rem] text-center">
              {totalItems}
            </span>
          </LocalizedClientLink>
        </Popover.Button>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <Popover.Panel
            static
            className="hidden small:block absolute top-[calc(100%+0.75rem)] right-0 bg-white rounded-xl shadow-2xl border border-gray-200 w-[440px] text-ui-fg-base overflow-hidden"
            data-testid="nav-cart-dropdown"
          >
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Mon Panier</h3>
                <p className="text-xs text-gray-500">{totalItems} article{totalItems > 1 ? "s" : ""}</p>
              </div>
            </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className="overflow-y-auto overflow-x-hidden max-h-[420px] px-6 py-4 grid grid-cols-1 gap-y-4 no-scrollbar">
                  {cartState.items
                    .sort((a, b) => {
                      return (a.created_at ?? "") > (b.created_at ?? "")
                        ? -1
                        : 1
                    })
                    .map((item) => (
                      <div
                        className="grid grid-cols-[80px_1fr] gap-x-3 pb-4 border-b border-gray-100 last:border-0 group hover:bg-gray-50 -mx-6 px-6 py-3 transition-colors min-w-0"
                        key={item.id}
                        data-testid="cart-item"
                      >
                        <LocalizedClientLink
                          href={`/products/${item.variant?.product?.handle}`}
                          className="relative overflow-hidden rounded-lg flex-shrink-0 w-[80px] h-[80px]"
                        >
                          <Thumbnail
                            thumbnail={item.variant?.product?.thumbnail}
                            images={item.variant?.product?.images}
                            size="square"
                          />
                          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-5 transition-opacity rounded-lg"></div>
                        </LocalizedClientLink>
                        <div className="flex flex-col justify-between min-w-0">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="flex flex-col min-w-0 flex-1">
                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                  <LocalizedClientLink
                                    href={`/products/${item.variant?.product?.handle}`}
                                    data-testid="product-link"
                                    className="hover:text-amber-600 transition-colors"
                                  >
                                    {item.title}
                                  </LocalizedClientLink>
                                </h3>
                                <LineItemOptions
                                  variant={item.variant}
                                  data-testid="cart-item-variant"
                                  data-value={item.variant}
                                />
                                <span
                                  className="text-xs text-gray-500 mt-1"
                                  data-testid="cart-item-quantity"
                                  data-value={item.quantity}
                                >
                                  Qté: {item.quantity}
                                </span>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <LineItemPrice item={item} style="tight" />
                              </div>
                            </div>
                          </div>
                          <DeleteButton
                            id={item.id}
                            className="mt-2 text-xs text-red-600 hover:text-red-700 hover:underline"
                            data-testid="cart-item-remove-button"
                          >
                            Retirer
                          </DeleteButton>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="p-6 flex flex-col gap-y-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Sous-total{" "}
                      <span className="text-xs">
                        {exempt ? "HT (exonéré)" : "TVAC"}
                      </span>
                    </span>
                    <span
                      className="text-xl font-bold text-gray-900"
                      data-testid="cart-subtotal"
                      data-value={itemsDisplayTotal}
                    >
                      {formatAmount(itemsDisplayTotal, cartState.currency_code ?? "eur")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg p-3">
                    <span>✓</span>
                    <span>Livraison gratuite dès 75€</span>
                  </div>
                  <LocalizedClientLink href="/cart" passHref>
                    <Button
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all"
                      size="large"
                      data-testid="go-to-cart-button"
                    >
                      Voir mon panier →
                    </Button>
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              <div>
                <div className="flex py-16 flex-col gap-y-6 items-center justify-center px-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-4xl">
                    🛒
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 mb-1">Votre panier est vide</h4>
                    <p className="text-sm text-gray-500">Découvrez nos produits équestres</p>
                  </div>
                  <div className="w-full">
                    <LocalizedClientLink href="/store">
                      <>
                        <span className="sr-only">Aller à la boutique</span>
                        <Button 
                          onClick={close}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
                        >
                          Explorer nos produits →
                        </Button>
                      </>
                    </LocalizedClientLink>
                  </div>
                </div>
              </div>
            )}
          </Popover.Panel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
