"use client"

import { useEffect, useState } from "react"
import { Button, Input, Text, Heading, clx } from "@medusajs/ui"
import { StoreCart } from "@medusajs/types"
import { MapPin, CheckCircleSolid } from "@medusajs/icons"
import { useTranslate } from "@lib/context/language-context"

// URL du backend Medusa + clé publishable (obligatoire pour les endpoints store)
const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

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
  const t = useTranslate()
  const [postalCode, setPostalCode] = useState(cart.shipping_address?.postal_code || "")
  const [points, setPoints] = useState<PickupPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    (cart.metadata?.bpost_pickup_point as any)?.Id || null
  )
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

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
      const countryCode = (cart.shipping_address?.country_code || "BE").toUpperCase()
      const city = cart.shipping_address?.city || ""
      const street = cart.shipping_address?.address_1 || ""
      const url = `${BACKEND_URL}/store/bpost/pickup-points?postal_code=${encodeURIComponent(
        postalCode.trim()
      )}&country=${encodeURIComponent(countryCode)}&city=${encodeURIComponent(city)}&street=${encodeURIComponent(
        street
      )}&cart_id=${encodeURIComponent(cart.id)}`
      console.log("[PickupPoints] Appel:", url)
      
      const res = await fetch(url, {
        headers: PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : undefined,
      })
      const data = await res.json()
      
      console.log("[PickupPoints] Réponse:", res.status, data)
      
      if (!res.ok) {
        throw new Error(data.error || `Erreur ${res.status}`)
      }
      
      setPoints(data.points || [])
      if ((data.points || []).length === 0) {
        setError(data.error || t("bpost.no_results" as any))
      }
    } catch (e: any) {
      console.error("[PickupPoints] Erreur:", e)
      setError(e.message || t("bpost.no_results" as any))
    } finally {
      setLoading(false)
    }
  }

  const selectPoint = async (point: PickupPoint) => {
    setLoading(true)
    try {
      // Sauvegarder le choix dans le backend (Cart Metadata)
      const res = await fetch(`${BACKEND_URL}/store/bpost/select-pickup-point`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
        },
        body: JSON.stringify({
          cartId: cart.id,
          pickupPoint: point
        }),
      })

      if (!res.ok) throw new Error("Erreur sauvegarde")
      
      setSelectedPointId(point.Id)
    } catch (e) {
      setError(t("bpost.no_results" as any))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex flex-col gap-4">
        <Heading level="h3" className="text-lg text-gray-900 flex items-center gap-2">
          <MapPin className="text-amber-600" />
          {t("bpost.title" as any)}
        </Heading>

        <div className="flex gap-2">
          <div className="w-full max-w-[200px]">
            <Input 
              placeholder={t("bpost.postal_code" as any)} 
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>
          <Button onClick={searchPoints} isLoading={loading} variant="secondary">
            {t("bpost.search" as any)}
          </Button>
        </div>

        {error && (
          <Text className="text-red-600 text-small-regular">{error}</Text>
        )}

        {/* Barre de recherche pour filtrer les points */}
        {points.length > 0 && (
          <div className="mt-2">
            <Input 
              placeholder={t("bpost.search_placeholder" as any)} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 mt-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {points
            .filter((point) => {
              if (!searchQuery.trim()) return true
              const query = searchQuery.toLowerCase()
              return (
                point.Name.toLowerCase().includes(query) ||
                point.Address.Streetname1.toLowerCase().includes(query) ||
                point.Address.City.toLowerCase().includes(query) ||
                point.Address.PostalCode.includes(query)
              )
            })
            .map((point) => {
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
                      {t("bpost.selected" as any)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          
          {points.filter((point) => {
            if (!searchQuery.trim()) return true
            const query = searchQuery.toLowerCase()
            return (
              point.Name.toLowerCase().includes(query) ||
              point.Address.Streetname1.toLowerCase().includes(query) ||
              point.Address.City.toLowerCase().includes(query) ||
              point.Address.PostalCode.includes(query)
            )
          }).length === 0 && points.length > 0 && searchQuery && (
            <Text className="text-gray-500 text-center py-4 italic">
              {t("bpost.no_search_results" as any)}
            </Text>
          )}
          
          {points.length === 0 && !loading && postalCode && (
            <Text className="text-gray-500 text-center py-4 italic">
              {t("bpost.no_results" as any)}
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}

export default PickupPoints
