"use client"

import { useWishlist } from "@lib/context/wishlist-context"
import { Heart } from "@medusajs/icons"
import { useState } from "react"

type WishlistToggleButtonProps = {
  productId: string
  size?: "sm" | "md" | "lg"
  variant?: "icon" | "button"
}

export default function WishlistToggleButton({
  productId,
  size = "md",
  variant = "icon",
}: WishlistToggleButtonProps) {
  const { isInWishlist, toggleItem } = useWishlist()
  const [isAnimating, setIsAnimating] = useState(false)

  const inWishlist = isInWishlist(productId)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsAnimating(true)
    toggleItem(productId)
    
    setTimeout(() => setIsAnimating(false), 600)
  }

  const iconSizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }

  const buttonSizeClasses = {
    sm: "w-7 h-7 min-w-[28px] min-h-[28px]",
    md: "w-9 h-9 min-w-[36px] min-h-[36px]",
    lg: "w-11 h-11 min-w-[44px] min-h-[44px]",
  }

  const buttonPaddingClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-3",
  }

  if (variant === "button") {
    return (
      <button
        onClick={handleClick}
        className={`
          ${buttonPaddingClasses[size]}
          rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2
          ${inWishlist
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-white border border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-500 hover:text-red-500"
          }
          ${isAnimating ? "scale-110" : "scale-100"}
        `}
        aria-label={inWishlist ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <Heart
          className={`${iconSizeClasses[size]} flex-shrink-0 transition-all ${
            inWishlist ? "fill-current" : ""
          } ${isAnimating ? "animate-bounce" : ""}`}
        />
        <span className="text-sm whitespace-nowrap">
          {inWishlist ? "Dans les favoris" : "Ajouter aux favoris"}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`
        ${buttonSizeClasses[size]}
        rounded-full bg-white/90 backdrop-blur-sm hover:bg-white border border-gray-200
        hover:border-red-500 transition-all duration-200 group shadow-sm hover:shadow-md
        flex items-center justify-center flex-shrink-0
        ${isAnimating ? "scale-110" : "scale-100"}
      `}
      aria-label={inWishlist ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Heart
        className={`${iconSizeClasses[size]} flex-shrink-0 transition-all ${
          inWishlist
            ? "fill-red-500 text-red-500"
            : "text-gray-600 group-hover:text-red-500"
        } ${isAnimating ? "animate-bounce" : ""}`}
      />
    </button>
  )
}

