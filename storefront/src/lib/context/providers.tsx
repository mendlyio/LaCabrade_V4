"use client"

import { WishlistProvider } from "./wishlist-context"
import { LanguageProvider } from "./language-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <WishlistProvider>{children}</WishlistProvider>
    </LanguageProvider>
  )
}

