"use client"

import { WishlistProvider } from "./wishlist-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return <WishlistProvider>{children}</WishlistProvider>
}

