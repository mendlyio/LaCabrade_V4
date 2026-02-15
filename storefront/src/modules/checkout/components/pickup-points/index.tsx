"use client"

import { useEffect, useState } from "react"
import { Button, Input, Text, Heading, clx } from "@medusajs/ui"
import { StoreCart } from "@medusajs/types"
import { MapPin, CheckCircleSolid } from "@medusajs/icons"
import { useTranslate } from "@lib/context/language-context"

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

/* ------------------------------------------------------------------ */
/*  Skeleton affiché pendant le chargement des points relais          */
/* ------------------------------------------------------------------ */
const PickupPointSkeleton = () => (
  <div className="grid grid-cols-1 gap-3 mt-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="p-4 border border-gray-200 rounded-md bg-white animate-pulse"
      >
        <div className="flex flex-col gap-2">
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
          <div className="h-3 w-1/2 bg-gray-100 rounded" />
        </div>
      </div>
    ))}
  </div>
)

const PickupPoints = ({ cart }: PickupPointsProps) => {
  const t = useTranslate()
  const [postalCode, setPostalCode] = useState(
    cart.shipping_address?.postal_code || ""
  )
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Recherche via le Route Handler Next.js (évite les erreurs CORS) */
  /* ---------------------------------------------------------------- */
  const searchPoints = async () => {
    if (!postalCode) return
    setLoading(true)
    setError(null)
    try {
      const countryCode = (
        cart.shipping_address?.country_code || "BE"
      ).toUpperCase()
      const city = cart.shipping_address?.city || ""
      const street = cart.shipping_address?.address_1 || ""

      const params = new URLSearchParams({
        zip: postalCode.trim(),
        country: countryCode,
        city,
        street,
        cart_id: cart.id,
      })

      const res = await fetch(`/api/bpost/points?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()

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

  /* ---------------------------------------------------------------- */
  /*  Sélection via le Route Handler Next.js                          */
  /* ---------------------------------------------------------------- */
  const selectPoint = async (point: PickupPoint) => {
    setLoading(true)
    try {
      const res = await fetch("/api/bpost/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cart.id,
          pickupPoint: point,
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

  /* ---------------------------------------------------------------- */
  /*  Filtrage local des résultats                                    */
  /* ---------------------------------------------------------------- */
  const filteredPoints = points.filter((point) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      point.Name.toLowerCase().includes(query) ||
      point.Address.Streetname1.toLowerCase().includes(query) ||
      point.Address.City.toLowerCase().includes(query) ||
      point.Address.PostalCode.includes(query)
    )
  })

  return (
    <div className="mt-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex flex-col gap-4">
        <Heading
          level="h3"
          className="text-lg text-gray-900 flex items-center gap-2"
        >
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
          <Button
            onClick={searchPoints}
            isLoading={loading}
            variant="secondary"
          >
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

        {/* Skeleton de chargement */}
        {loading && points.length === 0 && <PickupPointSkeleton />}

        {/* Liste des points relais */}
        <div className="grid grid-cols-1 gap-3 mt-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredPoints.map((point) => {
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
                      {isSelected && (
                        <CheckCircleSolid className="text-amber-600" />
                      )}
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

          {filteredPoints.length === 0 && points.length > 0 && searchQuery && (
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
