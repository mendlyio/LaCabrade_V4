"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { HttpTypes } from "@medusajs/types"

type WishlistContextType = {
  items: string[] // Product IDs
  addItem: (productId: string) => void
  removeItem: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  toggleItem: (productId: string) => void
  clearWishlist: () => void
  itemCount: number
}

const WishlistContext = createContext<WishlistContextType | null>(null)

export const useWishlist = () => {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Charger la wishlist depuis localStorage au montage
  useEffect(() => {
    const stored = localStorage.getItem("wishlist")
    if (stored) {
      try {
        setItems(JSON.parse(stored))
      } catch (error) {
        console.error("Erreur lors du chargement de la wishlist:", error)
      }
    }
    setIsLoaded(true)
  }, [])

  // Sauvegarder la wishlist dans localStorage à chaque changement
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("wishlist", JSON.stringify(items))
    }
  }, [items, isLoaded])

  const addItem = (productId: string) => {
    setItems((prev) => {
      if (!prev.includes(productId)) {
        return [...prev, productId]
      }
      return prev
    })
  }

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((id) => id !== productId))
  }

  const isInWishlist = (productId: string) => {
    return items.includes(productId)
  }

  const toggleItem = (productId: string) => {
    if (isInWishlist(productId)) {
      removeItem(productId)
    } else {
      addItem(productId)
    }
  }

  const clearWishlist = () => {
    setItems([])
  }

  return (
    <WishlistContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        isInWishlist,
        toggleItem,
        clearWishlist,
        itemCount: items.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

