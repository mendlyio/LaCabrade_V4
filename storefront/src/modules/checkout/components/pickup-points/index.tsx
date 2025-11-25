"use client"

import { useEffect, useState } from "react"
import { Button, Input, Text, Heading, clx } from "@medusajs/ui"
import { StoreCart } from "@medusajs/types"
import { getBaseURL } from "@lib/util/env"
import { MapPin, CheckCircleSolid } from "@medusajs/icons"

type PickupPointsProps = {
  cart: StoreCart
}

type PickupPoint = {
  Id: string
  Name: string
  Address: {
    Streetname1: string
    Streetname2?: string
    PostalCode: string
    City: string
    Country: string
  }
  Location?: {
    Latitude: string
    Longitude: string
  }
}

const PickupPoints = ({ cart }: PickupPointsProps) => {
  const [postalCode, setPostalCode] = useState(cart.shipping_address?.postal_code || "")
  const [points, setPoints] = useState<PickupPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    (cart.metadata?.bpost_pickup_point as any)?.Id || null
  )
  const [error, setError] = useState<string | null>(null)

  // Charger les points initiaux si code postal présent
  useEffect(() => {
    if (postalCode && !points.length) {
      searchPoints()
    }
  }, [])

  const searchPoints = async () => {
    if (!postalCode) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${getBaseURL()}/store/bpost/pickup-points?postalCode=${postalCode}&country=${cart.shipping_address?.country_code || "BE"}`)
      if (!res.ok) throw new Error("Erreur lors de la recherche")
      const data = await res.json()
      setPoints(data.points || [])
    } catch (e) {
      console.error(e)
      setError("Impossible de charger les points relais. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const selectPoint = async (point: PickupPoint) => {
    setLoading(true)
    try {
      // Sauvegarder le choix dans le backend (Cart Metadata)
      const res = await fetch(`${getBaseURL()}/store/bpost/select-pickup-point`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartId: cart.id,
          pickupPoint: point
        }),
      })

      if (!res.ok) throw new Error("Erreur sauvegarde")
      
      setSelectedPointId(point.Id)
    } catch (e) {
      setError("Impossible de sélectionner ce point relais.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex flex-col gap-4">
        <Heading level="h3" className="text-lg text-gray-900 flex items-center gap-2">
          <MapPin className="text-amber-600" />
          Choisir un point relais Bpost
        </Heading>

        <div className="flex gap-2">
          <div className="w-full max-w-[200px]">
            <Input 
              placeholder="Code postal" 
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>
          <Button onClick={searchPoints} isLoading={loading} variant="secondary">
            Rechercher
          </Button>
        </div>

        {error && (
          <Text className="text-red-600 text-small-regular">{error}</Text>
        )}

        <div className="grid grid-cols-1 gap-3 mt-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {points.map((point) => {
            const isSelected = selectedPointId === point.Id
            return (
              <div 
                key={point.Id}
                onClick={() => !loading && selectPoint(point)}
                className={clx(
                  "p-4 border rounded-md cursor-pointer transition-all hover:shadow-md",
                  isSelected 
                    ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600" 
                    : "border-gray-200 bg-white hover:border-amber-300"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <Text className="font-bold text-gray-900 flex items-center gap-2">
                      {point.Name}
                      {isSelected && <CheckCircleSolid className="text-amber-600" />}
                    </Text>
                    <Text className="text-small-regular text-gray-600 mt-1">
                      {point.Address.Streetname1} {point.Address.Streetname2}
                    </Text>
                    <Text className="text-small-regular text-gray-500">
                      {point.Address.PostalCode} {point.Address.City}
                    </Text>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-bold text-amber-600 bg-white px-2 py-1 rounded border border-amber-200">
                      Sélectionné
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          
          {points.length === 0 && !loading && postalCode && (
            <Text className="text-gray-500 text-center py-4 italic">
              Aucun point relais trouvé pour ce code postal.
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}

export default PickupPoints
