"use client"

import { useCallback, useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Portes Ouvertes octobre 2026 — 16 oct 00:00 → 24 oct 23:59 (heure belge, CEST)
const START_AT = new Date("2026-10-15T22:00:00.000Z")
const END_AT = new Date("2026-10-24T21:59:59.000Z")
const STORAGE_KEY = "lc_po_octobre_2026_popup_v2"
const DELAY_MS = 900
const IMAGE_SRC = "/promotions/portes-ouvertes-octobre-2026.webp"

/** Vrai pendant la campagne affichée en popup (la newsletter cède la place). */
export function isBraderiePopupActive(now = new Date()): boolean {
  return now >= START_AT && now <= END_AT
}

export default function BraderiePopup() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isBraderiePopupActive()) return
    if (localStorage.getItem(STORAGE_KEY)) return

    const timer = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl bg-[#f6f3ee] shadow-2xl animate-popup-in"
        role="dialog"
        aria-modal="true"
        aria-label="Portes ouvertes La Cabrade, du 16 au 24 octobre"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer la popup Portes ouvertes"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#7f1d1d] shadow-sm transition hover:bg-white"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <LocalizedClientLink
          href="/store"
          onClick={dismiss}
          className="block focus:outline-none focus:ring-4 focus:ring-[#7f1d1d]/30"
          aria-label="Voir la boutique — Portes ouvertes, cavalier -20 %, outlet -60 %"
        >
          <img
            src={IMAGE_SRC}
            alt="Portes ouvertes La Cabrade, du 16 au 24 octobre. -20 % sur toute la catégorie cavalier, -60 % sur toute la catégorie outlet."
            width={1400}
            height={1400}
            className="h-auto w-full"
          />
        </LocalizedClientLink>
      </div>
    </div>
  )
}
