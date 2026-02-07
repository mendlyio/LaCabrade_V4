"use client"

import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

/**
 * Détermine automatiquement l'étape du checkout à afficher
 * en fonction de l'état du panier. Redirige si aucun step
 * n'est dans l'URL (ex: après un refresh).
 */
const CheckoutStepRouter = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const currentStep = searchParams.get("step")

    // Si un step est déjà défini dans l'URL, on ne touche à rien
    if (currentStep) return

    // Déterminer la bonne étape basée sur l'état du cart
    let targetStep = "address"

    const hasAddress = !!(
      cart.shipping_address?.address_1 &&
      cart.shipping_address?.city &&
      cart.shipping_address?.country_code &&
      cart.email
    )

    const hasShipping = (cart.shipping_methods?.length ?? 0) > 0

    const hasPayment = !!(
      cart.payment_collection?.payment_sessions?.find(
        (s: any) => s.status === "pending"
      )
    )

    if (!hasAddress) {
      targetStep = "address"
    } else if (!hasShipping) {
      targetStep = "delivery"
    } else if (!hasPayment) {
      targetStep = "payment"
    } else {
      targetStep = "review"
    }

    // Pousser la bonne étape dans l'URL
    const params = new URLSearchParams(searchParams.toString())
    params.set("step", targetStep)
    router.replace(pathname + "?" + params.toString(), { scroll: false })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export default CheckoutStepRouter
