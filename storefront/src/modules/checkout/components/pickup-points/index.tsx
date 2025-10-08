"use client"

import { useEffect, useMemo, useState } from "react"
import { Button, Input, Text } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"

type PickupPoint = {
  Id?: string
  id?: string
  Name?: string
  name?: string
  Address?: {
    Streetname1?: string
    PostalCode?: string
    City?: string
    Country?: string
  }
}

type Props = {
  cart: HttpTypes.StoreCart
}

const PickupPoints: React.FC<Props> = ({ cart }) => {
  const [postalCode, setPostalCode] = useState<string>(cart?.shipping_address?.postal_code || "")
  const [countryCode] = useState<string>((cart?.shipping_address?.country_code || "BE").toUpperCase())
  const [points, setPoints] = useState<PickupPoint[]>([])
  const [total, setTotal] = useState<number>(0)
  const [limit, setLimit] = useState<number>(10)
  const [offset, setOffset] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(
    (cart.metadata as any)?.bpost_pickup_point?.Id || (cart.metadata as any)?.bpost_pickup_point?.id || null
  )

  const hasPrev = offset > 0
  const hasNext = offset + points.length < total

  const currentFrom = useMemo(() => (total === 0 ? 0 : offset + 1), [total, offset])
  const currentTo = useMemo(() => Math.min(offset + points.length, total), [offset, points.length, total])

  const loadPoints = async (nextOffset?: number, nextLimit?: number) => {
    setLoading(true)
    setError(null)
    try {
      const pc = (postalCode || "").trim()
      if (!pc) {
        setPoints([])
        setTotal(0)
        setOffset(0)
        setLoading(false)
        return
      }
      if (countryCode === "BE" && !/^\d{4}$/.test(pc)) {
        setError("Code postal invalide (format BE: 4 chiffres)")
        setLoading(false)
        return
      }
      const off = typeof nextOffset === "number" ? nextOffset : offset
      const lim = typeof nextLimit === "number" ? nextLimit : limit
      const url = `/store/bpost/pickup-points?postal_code=${encodeURIComponent(pc)}&country=${encodeURIComponent(countryCode)}&offset=${off}&limit=${lim}`
      const res = await fetch(url)
      const data = await res.json()
      setPoints(data.points || [])
      setTotal(data.total || 0)
      setLimit(data.limit || lim)
      setOffset(data.offset || off)
    } catch (e: any) {
      setError(e.message || "Erreur lors du chargement des points relais")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (postalCode && postalCode.length >= 3) {
      loadPoints(0, limit)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectPoint = async (point: PickupPoint) => {
    if (!cart?.id) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/store/bpost/select-pickup-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_id: cart.id, pickup_point: point }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || `Erreur ${res.status}`)
      }
      setSelectedId((point.Id || point.id) as string)
    } catch (e: any) {
      setError(e.message || "Erreur lors de la sélection du point relais")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-2">
        <Text className="txt-medium-plus">Point relais (Bpost) — optionnel</Text>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Input
          placeholder="Code postal"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
        />
        <Button
          size="small"
          onClick={() => loadPoints(0, limit)}
          isLoading={loading}
          disabled={!postalCode || postalCode.length < 3}
        >
          Rechercher
        </Button>
      </div>
      {error && (
        <div className="text-red-600 text-small-regular mb-2">{error}</div>
      )}
      {!loading && points.length === 0 && (
        <div className="text-ui-fg-subtle text-small-regular">Aucun point trouvé.</div>
      )}
      <ul className="divide-y rounded-rounded border">
        {points.map((p) => {
          const pid = (p.Id || p.id) as string
          const name = p.Name || p.name || "Point relais"
          const a = p.Address || {}
          const addressLine = [a.Streetname1, a.PostalCode, a.City].filter(Boolean).join(", ")
          const isSelected = selectedId === pid
          return (
            <li key={pid} className="p-3 flex items-center justify-between">
              <div>
                <div className="text-base-regular">{name}</div>
                <div className="text-ui-fg-subtle text-small-regular">{addressLine}</div>
              </div>
              <Button
                variant={isSelected ? "secondary" : "primary"}
                onClick={() => selectPoint(p)}
                isLoading={saving && selectedId === pid}
              >
                {isSelected ? "Sélectionné" : "Sélectionner"}
              </Button>
            </li>
          )
        })}
      </ul>
      {total > 0 && (
        <div className="flex items-center gap-2 justify-between mt-3">
          <div className="text-small-regular text-ui-fg-subtle">
            {currentFrom}-{currentTo} sur {total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant="secondary"
              onClick={() => loadPoints(Math.max(offset - limit, 0), limit)}
              disabled={!hasPrev || loading}
            >
              Précédent
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => loadPoints(offset + limit, limit)}
              disabled={!hasNext || loading}
            >
              Suivant
            </Button>
            <select
              value={limit}
              onChange={(e) => loadPoints(0, parseInt(e.target.value))}
              className="text-small-regular border rounded-rounded px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export default PickupPoints


