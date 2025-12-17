"use client"

import { useWishlist } from "@lib/context/wishlist-context"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heart } from "@medusajs/icons"

export default function WishlistButton() {
  const { itemCount } = useWishlist()

  return (
    <LocalizedClientLink
      href="/wishlist"
      className="hidden sm:flex p-2 rounded-lg hover:bg-gray-100 transition-colors relative group"
      aria-label="Liste de souhaits"
    >
      <Heart className="w-5 h-5 text-gray-600 group-hover:text-amber-600 transition-colors" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
          {itemCount}
        </span>
      )}
    </LocalizedClientLink>
  )
}

