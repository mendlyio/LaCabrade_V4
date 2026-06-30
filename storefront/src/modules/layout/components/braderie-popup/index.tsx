"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const START_AT = new Date("2026-06-29T22:00:00.000Z")
const END_AT = new Date("2026-07-31T21:59:59.000Z")
const STORAGE_KEY = "lc_soldes_ete_2026_popup_dismissed"
const DELAY_MS = 900
const IMAGE_SRC = "https://ik.imagekit.io/kodt9cn6f/soldeLC.webp"

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
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl bg-[#f5dde3] shadow-2xl animate-popup-in"
        role="dialog"
        aria-modal="true"
        aria-label="Soldes Été La Cabrade"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer la popup Soldes"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#be123c] shadow-sm transition hover:bg-white hover:text-[#9f1239]"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <LocalizedClientLink
          href="/promotions"
          onClick={dismiss}
          className="block focus:outline-none focus:ring-4 focus:ring-[#be123c]/30"
          aria-label="Voir les Soldes La Cabrade"
        >
          <Image
            src={IMAGE_SRC}
            alt="Soldes Été La Cabrade — Vêtements Cavalier -25%, LC Equestrian -15%, Outlet -60%"
            width={1080}
            height={1350}
            priority
            sizes="(max-width: 640px) 92vw, 420px"
            className="h-auto w-full"
          />
        </LocalizedClientLink>
      </div>
    </div>
  )
}
