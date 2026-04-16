"use client"

import { useRef, useState } from "react"
import Image from "next/image"

type ProductImage = { url: string; id?: string }

type Props = {
  thumbUrl: string | null
  hoverImages: ProductImage[]
  title: string
  quality?: number
  sizes?: string
}

/**
 * Gestion images carte produit (Client Component).
 * - Desktop : survol → affiche la 2e image (transition douce)
 * - Mobile  : swipe gauche/droite → défile toutes les images (thumb + hoverImages)
 */
export default function ProductCardImages({
  thumbUrl,
  hoverImages,
  title,
  quality = 70,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
}: Props) {
  const allImages: string[] = [
    ...(thumbUrl ? [thumbUrl] : []),
    ...hoverImages.map((i) => i.url),
  ]

  const [activeIdx, setActiveIdx] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  // Sur desktop : on affiche la 2e image au survol (index 1), sinon la 1re (index 0)
  const desktopDisplayIdx = isHovered && allImages.length > 1 ? 1 : 0

  // Sur mobile (touch), activeIdx contrôle l'image affichée
  const isTouchDevice = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches

  const displayIdx = isTouchDevice ? activeIdx : desktopDisplayIdx
  const displayUrl = allImages[displayIdx] || thumbUrl || ""

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = touchStartY.current - e.changedTouches[0].clientY

    // Ne réagir qu'aux glissements principalement horizontaux
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) {
        // Swipe gauche → image suivante
        setActiveIdx((i) => Math.min(i + 1, allImages.length - 1))
      } else {
        // Swipe droite → image précédente
        setActiveIdx((i) => Math.max(i - 1, 0))
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div
      className="relative aspect-[4/5] overflow-hidden bg-gray-50 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {displayUrl ? (
        <Image
          src={displayUrl}
          alt={title || "Produit"}
          fill
          quality={quality}
          className="object-cover transition-all duration-500 ease-out"
          sizes={sizes}
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      )}

      {/* Indicateur points — visible uniquement sur mobile (hover:none) */}
      {allImages.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none md:hidden">
          {allImages.map((_, i) => (
            <span
              key={i}
              className={`block rounded-full transition-all duration-200 ${
                i === activeIdx
                  ? "w-3 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
