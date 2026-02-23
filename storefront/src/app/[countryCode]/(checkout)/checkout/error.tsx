"use client"

import { useEffect } from "react"
import { Button } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log l'erreur complète en dev pour diagnostic
    console.error("[Checkout Error]", error)
    console.error("[Checkout Error] Message:", error.message)
    console.error("[Checkout Error] Digest:", error.digest)
    console.error("[Checkout Error] Stack:", error.stack)
  }, [error])

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Une erreur est survenue
      </h2>
      <p className="text-sm text-gray-600 mb-4 max-w-md">
        {process.env.NODE_ENV === "development" ? (
          <>
            <span className="font-mono text-xs block text-left bg-gray-100 p-3 rounded mb-2 overflow-auto">
              {error.message}
            </span>
            Consultez la console du navigateur (F12) pour plus de détails.
          </>
        ) : (
          "Impossible de charger la page de paiement. Veuillez réessayer."
        )}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="secondary">
          Réessayer
        </Button>
        <LocalizedClientLink href="/cart">
          <Button variant="secondary">Retour au panier</Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}
