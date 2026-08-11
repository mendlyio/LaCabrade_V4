"use client"

import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { getActivePaymentSession } from "@lib/util/payment-session"

function shippingMethodNeedsPickupPoint(
  method: { name?: string | null; data?: Record<string, unknown> | null } | undefined | null
): "store" | "bpost" | null {
  if (!method) return null
  const name = (method.name ?? "").toLowerCase()
  const mode = String(
    (method.data as any)?.mode ?? (method as any).metadata?.mode ?? ""
  ).toLowerCase()
  const provider = String((method as any).provider_id ?? "").toLowerCase()

  if (
    mode === "store_pickup" ||
    (name.includes("retrait") &&
      (name.includes("dépôt") ||
        name.includes("depot") ||
        name.includes("magasin"))) ||
    (name.includes("click") && name.includes("collect"))
  ) {
    return "store"
  }

  if (provider.includes("bpost") && mode === "pickup") {
    return "bpost"
  }

  return null
}

/**
 * Détermine automatiquement l'étape du checkout à afficher
 * en fonction de l'état du panier. Redirige si aucun step
 * n'est dans l'URL (ex: après un refresh).
 *
 * Important : pour retrait magasin / point relais Bpost, la simple
 * présence d'une shipping_method ne suffit pas — le point choisi
 * doit être en metadata, sinon on reste sur "delivery".
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

    const shippingMethod =
      cart.shipping_methods?.at(-1) ?? cart.shipping_methods?.[0]
    const hasShipping = !!shippingMethod

    const pickupKind = shippingMethodNeedsPickupPoint(shippingMethod as any)
    const hasStorePickupLocation = !!(cart.metadata as any)?.pickup_location?.id
    const hasBpostPickupPoint = !!(cart.metadata as any)?.bpost_pickup_point?.Id
    const shippingComplete =
      hasShipping &&
      (pickupKind === null ||
        (pickupKind === "store" && hasStorePickupLocation) ||
        (pickupKind === "bpost" && hasBpostPickupPoint))

    const hasPayment = !!getActivePaymentSession(
      cart.payment_collection?.payment_sessions
    )

    if (!hasAddress) {
      targetStep = "address"
    } else if (!shippingComplete) {
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
