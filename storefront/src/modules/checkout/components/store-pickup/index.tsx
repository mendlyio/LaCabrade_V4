"use client"

import { useEffect, useState, useTransition } from "react"
import { Text, Heading, clx } from "@medusajs/ui"
import { CheckCircleSolid, MapPin } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { setPickupLocation } from "@lib/data/cart"

/* ------------------------------------------------------------------ */
/*  Liste des magasins disponibles pour le retrait                    */
/* ------------------------------------------------------------------ */
const storeLocations = [
  {
    id: "q8-malmedy",
    name: "Q8 Malmedy",
    address: "Avenue du pont de Warche 9, 4960 Malmedy",
  },
  {
    id: "q8-rechain",
    name: "Q8 Petit Rechain",
    address: "Avenue du parc 27, 4800 Verviers",
  },
  {
    id: "capalu-vith",
    name: "Capalu Saint Vith",
    address: "Hauptstrasse 49, 4780 Saint Vith",
  },
  {
    id: "tomco-waremme",
    name: "Tom & Co Waremme",
    address: "Chau. Romaine 246, 4300 Waremme",
  },
  {
    id: "esso-spa",
    name: "Esso Goffin Spa",
    address: "Av. Jean Gouders 118, 4845 Jalhay",
  },
  {
    id: "cabrade-retinne",
    name: "Sellerie la Cabrade",
    address: "Rue de la clef 96, 4621 Retinne",
  },
] as const

export type StoreLocation = (typeof storeLocations)[number]

type StorePickupProps = {
  cart: HttpTypes.StoreCart
}

const StorePickup = ({ cart }: StorePickupProps) => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Récupérer la sélection existante depuis les métadonnées du panier
  const savedLocation = (cart.metadata?.pickup_location as StoreLocation) ?? null
  const [selectedId, setSelectedId] = useState<string | null>(
    savedLocation?.id ?? null
  )

  // Synchroniser si le cart change
  useEffect(() => {
    const loc = (cart.metadata?.pickup_location as StoreLocation) ?? null
    setSelectedId(loc?.id ?? null)
  }, [cart.metadata?.pickup_location])

  const handleSelect = (location: StoreLocation) => {
    if (isPending) return
    setError(null)
    setSelectedId(location.id)

    startTransition(async () => {
      try {
        await setPickupLocation({
          cartId: cart.id,
          pickupLocation: {
            id: location.id,
            name: location.name,
            address: location.address,
          },
        })
      } catch (e: any) {
        setError("Impossible de sauvegarder le choix. Réessayez.")
        setSelectedId(savedLocation?.id ?? null)
      }
    })
  }

  return (
    <div className="mt-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex flex-col gap-4">
        <Heading
          level="h3"
          className="text-lg text-gray-900 flex items-center gap-2"
        >
          <MapPin className="text-amber-600" />
          Choisissez votre point de retrait
        </Heading>

        <Text className="text-sm text-gray-500">
          Sélectionnez le magasin où vous souhaitez retirer votre commande.
          Vous recevrez un e-mail dès que celle-ci sera prête.
        </Text>

        {error && (
          <Text className="text-red-600 text-sm">{error}</Text>
        )}

        <div className="grid grid-cols-1 gap-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
          {storeLocations.map((location) => {
            const isSelected = selectedId === location.id
            return (
              <div
                key={location.id}
                onClick={() => handleSelect(location)}
                className={clx(
                  "p-4 border rounded-md cursor-pointer transition-all hover:shadow-md",
                  isPending && "opacity-60 pointer-events-none",
                  isSelected
                    ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600"
                    : "border-gray-200 bg-white hover:border-amber-300"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <Text className="font-bold text-gray-900 flex items-center gap-2">
                      {location.name}
                      {isSelected && (
                        <CheckCircleSolid className="text-amber-600" />
                      )}
                    </Text>
                    <Text className="text-small-regular text-gray-600 mt-1">
                      {location.address}
                    </Text>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-bold text-amber-600 bg-white px-2 py-1 rounded border border-amber-200 whitespace-nowrap">
                      Sélectionné
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <Text className="text-xs text-gray-400 italic">
          Retrait gratuit — 0,00 €
        </Text>
      </div>
    </div>
  )
}

export default StorePickup
