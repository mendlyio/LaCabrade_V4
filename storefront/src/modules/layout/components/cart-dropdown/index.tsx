"use client"

import { Popover, Transition } from "@headlessui/react"
import { Button } from "@medusajs/ui"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

import {
  getDisplayTaxEuros,
  getItemsDisplayTotalEuros,
  getItemAdjustmentsEuros,
  isIntraCommunityExempt,
} from "@lib/util/cart-amounts"
import { formatAmount } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { lineItemToTrackingItem } from "@lib/tracking"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { useTranslate } from "@lib/context/language-context"

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const t = useTranslate()
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

  // Montants Odoo en euros. Affichage TVAC (TTC) uniforme.
  const cartInput = cartState as any

  // Sous-total brut : compare_at_unit_price pour les articles outlet
  let grossSubtotal = 0
  let outletDiscountTTC = 0
  for (const item of cartState?.items ?? []) {
    const compareAt: number | null =
      (item as any).compare_at_unit_price ??
      ((item as any).metadata as any)?.outlet_original_price ??
      null
    const unitPrice = item.unit_price ?? 0
    const qty = item.quantity ?? 1
    if (compareAt != null && compareAt > unitPrice) {
      grossSubtotal += compareAt * qty
      outletDiscountTTC += (compareAt - unitPrice) * qty
    } else {
      grossSubtotal += unitPrice * qty
    }
  }
  const itemsDisplayTotal = grossSubtotal > 0 ? grossSubtotal : getItemsDisplayTotalEuros(cartInput)
  const adjDiscountTotal = getItemAdjustmentsEuros(cartInput) ?? 0
  const discountTotal = outletDiscountTTC + adjDiscountTotal
  const netTotal = Math.max(0, itemsDisplayTotal - discountTotal)
  const taxDisplayTotal = getDisplayTaxEuros(cartInput)
  const exempt = isIntraCommunityExempt(cartInput)
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

  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    itemRef.current = totalItems
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems])

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
            <span className="hidden sm:inline">{t("cart.panier_btn" as any)}</span>
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
            className="hidden small:block absolute top-[calc(100%+0.75rem)] right-0 bg-white rounded-xl shadow-2xl border border-gray-200 w-[440px] text-ui-fg-base"
            style={{ maxHeight: 'calc(100vh - 6rem)' }}
            data-testid="nav-cart-dropdown"
          >
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'inherit', borderRadius: 'inherit', overflow: 'hidden' }}>
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100" style={{ flexShrink: 0 }}>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t("cart.my_cart" as any)}</h3>
                <p className="text-xs text-gray-500">
                  {totalItems} {totalItems > 1 ? t("cart.articles" as any) : t("cart.article" as any)}
                </p>
              </div>
            </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className="px-6 py-4 grid grid-cols-1 gap-y-4" style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
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
                            alt={item.product_title ?? t("cart.product_alt" as any)}
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
                                  {t("cart.qty" as any)} {item.quantity}
                                </span>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <LineItemPrice item={item} style="tight" />
                              </div>
                            </div>
                          </div>
                          <DeleteButton
                            id={item.id}
                            trackingItem={lineItemToTrackingItem(
                              item as any,
                              item.product_title ?? undefined
                            )}
                            className="mt-2 text-xs text-red-600 hover:text-red-700 hover:underline"
                            data-testid="cart-item-remove-button"
                          >
                            {t("cart.remove" as any)}
                          </DeleteButton>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="p-6 flex flex-col gap-y-4 border-t border-gray-200 bg-gray-50" style={{ flexShrink: 0 }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t("cart.subtotal_label" as any)}{" "}
                      <span className="text-xs">
                        {exempt ? t("cart.excl_vat" as any) : t("cart.incl_vat" as any)}
                      </span>
                    </span>
                    <div className="text-right">
                      {discountTotal > 0 && (
                        <div className="text-xs text-gray-400 line-through leading-none mb-0.5">
                          {formatAmount(itemsDisplayTotal, cartState.currency_code ?? "eur")}
                        </div>
                      )}
                      <span
                        className="text-xl font-bold text-gray-900"
                        data-testid="cart-subtotal"
                        data-value={netTotal}
                      >
                        {formatAmount(netTotal, cartState.currency_code ?? "eur")}
                      </span>
                    </div>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Réduction PO
                      </span>
                      <span className="font-medium text-green-600">
                        - {formatAmount(discountTotal, cartState.currency_code ?? "eur")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t("cart.vat" as any)}</span>
                    <span className={`font-medium ${exempt ? "text-emerald-600" : "text-gray-900"}`} data-testid="cart-taxes" data-value={taxDisplayTotal}>
                      {formatAmount(taxDisplayTotal, cartState.currency_code ?? "eur")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg p-3">
                    <span>✓</span>
                    <span>{t("cart.free_shipping_threshold" as any)}</span>
                  </div>
                  <LocalizedClientLink href="/cart" passHref>
                    <Button
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all"
                      size="large"
                      data-testid="go-to-cart-button"
                    >
                      {t("cart.view_cart" as any)}
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
                    <h4 className="font-semibold text-gray-900 mb-1">{t("cart.empty_title" as any)}</h4>
                    <p className="text-sm text-gray-500">{t("cart.empty_desc" as any)}</p>
                  </div>
                  <div className="w-full">
                    <LocalizedClientLink href="/store">
                      <>
                        <span className="sr-only">{t("cart.go_to_store" as any)}</span>
                        <Button
                          onClick={close}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
                        >
                          {t("cart.explore" as any)}
                        </Button>
                      </>
                    </LocalizedClientLink>
                  </div>
                </div>
              </div>
            )}
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
