"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ShoppingBag } from "@medusajs/icons"
import { useTranslate } from "@lib/context/language-context"

type NavCartFallbackProps = {
  cachedCartCount: number
}

export default function NavCartFallback({ cachedCartCount }: NavCartFallbackProps) {
  const t = useTranslate()
  return (
    <LocalizedClientLink
      className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium text-sm"
      href="/cart"
      data-testid="nav-cart-link"
    >
      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
      <span className="hidden sm:inline">{t("cart.panier_btn" as any)}</span>
      <span className="bg-white text-amber-600 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-bold">
        {cachedCartCount}
      </span>
    </LocalizedClientLink>
  )
}
