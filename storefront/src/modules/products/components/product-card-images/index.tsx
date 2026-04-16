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

const Placeholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
    <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  </div>
)

/**
 * Gestion images carte produit (Client Component).
 *
 * Desktop  : survol → fondu vers la 1re hover image + ligne de progression en bas
 * Mobile   : swipe gauche/droite entre toutes les images + points indicateurs
 *
 * Note: la séparation desktop/mobile se fait via classes CSS md: (pas de JS matchMedia)
 * pour éviter les faux positifs pendant l'hydratation.
 */
export default function ProductCardImages({
  thumbUrl,
  hoverImages,
  title,
  quality = 70,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
}: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  // Liste complète déduplicatée : [thumbnail, img1, img2, img3, ...]
  // On skip ensuite l'index 1 (image 2) pour le survol desktop et le swipe mobile.
  const allUrls: string[] = []
  if (thumbUrl) allUrls.push(thumbUrl)
  for (const img of hoverImages) {
    if (img.url && !allUrls.includes(img.url)) allUrls.push(img.url)
  }

  // Mobile : toutes les images sauf l'index 1 (image 2 skippée)
  const mobileImages = allUrls.filter((_, i) => i !== 1)
  const mobileSrc = mobileImages[Math.min(activeIdx, mobileImages.length - 1)] || ""

  // Desktop : image de survol = index 2 de la liste complète (3e image)
  const desktopHoverSrc = allUrls[2] || null
  const hasHover = !!desktopHoverSrc

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = touchStartY.current - e.changedTouches[0].clientY

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) setActiveIdx((i) => Math.min(i + 1, mobileImages.length - 1))
      else setActiveIdx((i) => Math.max(i - 1, 0))
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
      {/* ── DESKTOP : image principale + overlay de survol ── */}
      <div className="hidden md:block absolute inset-0">
        {thumbUrl ? (
          <Image
            src={thumbUrl}
            alt={title || "Produit"}
            fill
            quality={quality}
            className={`object-cover transition-all duration-700 ease-out ${
              hasHover && isHovered ? "opacity-0 scale-105" : "opacity-100 scale-100"
            }`}
            sizes={sizes}
          />
        ) : (
          <Placeholder />
        )}

        {desktopHoverSrc && (
          <Image
            src={desktopHoverSrc}
            alt={`${title} - vue alternative`}
            fill
            quality={quality}
            loading="lazy"
            className={`object-cover absolute inset-0 transition-all duration-700 ease-out ${
              isHovered ? "opacity-100 scale-100" : "opacity-0 scale-[1.05]"
            }`}
            sizes={sizes}
          />
        )}
      </div>

      {/* ── MOBILE : image courante (swipe) ── */}
      <div className="block md:hidden absolute inset-0">
        {mobileSrc ? (
          <Image
            src={mobileSrc}
            alt={title || "Produit"}
            fill
            quality={quality}
            className="object-cover"
            sizes={sizes}
            draggable={false}
          />
        ) : (
          <Placeholder />
        )}
      </div>

      {/* ── Ligne de progression — desktop (haut de l'image) ── */}
      {hasHover && (
        <div className="hidden md:block absolute top-0 left-0 right-0 h-[3px] bg-black/10 z-20">
          <div
            className={`h-full bg-white/90 transition-all ease-out ${
              isHovered ? "w-full duration-700" : "w-0 duration-200"
            }`}
          />
        </div>
      )}

      {/* ── Points indicateurs — mobile uniquement (haut de l'image) ── */}
      {mobileImages.length > 1 && (
        <div className="flex md:hidden absolute top-2 left-1/2 -translate-x-1/2 gap-1 pointer-events-none z-20">
          {mobileImages.map((_, i) => (
            <span
              key={i}
              className={`block rounded-full transition-all duration-200 ${
                i === activeIdx ? "w-3 h-1.5 bg-white shadow-sm" : "w-1.5 h-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
