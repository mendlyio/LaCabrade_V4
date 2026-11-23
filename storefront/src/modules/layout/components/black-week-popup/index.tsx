"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// 23 nov 00:00 → 30 nov 23:59:59 inclus, heure de Bruxelles (CET = UTC+1).
const START_AT = new Date("2026-11-22T23:00:00.000Z")
const END_AT = new Date("2026-11-30T22:59:59.000Z")
const STORAGE_KEY = "lc_blackweek_2026_popup"
const DELAY_MS = 900
const IMAGE_SRC = "/promotions/blackweek-2026.webp"

/** Vrai uniquement pendant la Black Week. Ensuite, plus jamais. */
export function isBlackWeekPopupActive(now = new Date()): boolean {
  return now >= START_AT && now <= END_AT
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, "1")
  } catch {
    // navigation privée : la fermeture vaut au moins pour cette page
  }
}

export default function BlackWeekPopup() {
  const [visible, setVisible] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).has("apercu-blackweek")
    if (!preview) {
      if (!isBlackWeekPopupActive()) return
      if (readDismissed()) return
    }

    const timer = window.setTimeout(() => setVisible(true), DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const dismiss = useCallback(() => {
    rememberDismissed()
    setVisible(false)
  }, [])

  useEffect(() => {
    if (!visible) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        dismiss()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [visible, dismiss])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 pb-36 sm:pb-28"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl bg-black shadow-2xl motion-safe:animate-popup-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="sr-only">
          Black Week, du 23 au 30 novembre
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label="Fermer la fenêtre Black Week"
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-black shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-white/70"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <LocalizedClientLink
          href="/store"
          onClick={dismiss}
          className="block focus:outline-none focus:ring-4 focus:ring-white/60"
          aria-label="Voir la boutique — Black Week"
        >
          <img
            src={IMAGE_SRC}
            alt="Black Week du 23 au 30 novembre à La Cabrade : tous les vêtements −20 %, 1 couverture −20 %, à partir de 2 couvertures −30 %, Outlet XXL −60 %, en ligne et en magasin."
            width={840}
            height={1120}
            decoding="async"
            className="h-auto max-h-[min(640px,calc(100dvh-9rem))] w-full object-contain"
          />
        </LocalizedClientLink>
      </div>
    </div>
  )
}
