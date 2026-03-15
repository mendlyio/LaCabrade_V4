"use client"

import { useCallback, useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"

type ImageGalleryModernProps = {
  images: HttpTypes.StoreProductImage[]
  productTitle?: string
}

export default function ImageGalleryModern({ images, productTitle }: ImageGalleryModernProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const prevImage = useCallback(() => {
    setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  const nextImage = useCallback(() => {
    setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false)
      if (e.key === "ArrowLeft") prevImage()
      if (e.key === "ArrowRight") nextImage()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [lightboxOpen, prevImage, nextImage])

  // Lock scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [lightboxOpen])

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center">
        <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Main Image */}
        <div className="relative group">
          <div
            className="aspect-square rounded-2xl overflow-hidden bg-gray-50 cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
          >
            <Image
              src={images[selectedImage].url}
              alt={productTitle ? `${productTitle} - photo ${selectedImage + 1}` : `Photo produit ${selectedImage + 1}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110"
                aria-label="Image précédente"
              >
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110"
                aria-label="Image suivante"
              >
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Image Counter + Fullscreen hint */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {images.length > 1 && (
              <div className="bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-medium">
                {selectedImage + 1} / {images.length}
              </div>
            )}
            <button
              onClick={() => setLightboxOpen(true)}
              className="bg-black/60 backdrop-blur-sm text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              aria-label="Plein écran"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={image.id || index}
                onClick={() => setSelectedImage(index)}
                className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden transition-all duration-200 ${
                  selectedImage === index
                    ? "border-2 border-amber-500 opacity-100 scale-105"
                    : "border border-gray-200 opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.url}
                  alt={productTitle ? `${productTitle} - miniature ${index + 1}` : `Miniature ${index + 1}`}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Fullscreen */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
              {selectedImage + 1} / {images.length}
            </div>
          )}

          {/* Main Image */}
          <div className="relative w-full h-full max-w-5xl max-h-[85vh] mx-4 flex items-center justify-center">
            <Image
              src={images[selectedImage].url}
              alt={productTitle ? `${productTitle} - photo ${selectedImage + 1}` : `Photo produit ${selectedImage + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
                aria-label="Image précédente"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
                aria-label="Image suivante"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-sm rounded-xl p-2">
              {images.map((image, index) => (
                <button
                  key={image.id || index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-12 h-12 rounded-lg overflow-hidden transition-all ${
                    selectedImage === index
                      ? "ring-2 ring-white opacity-100 scale-110"
                      : "opacity-50 hover:opacity-80"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={productTitle ? `${productTitle} - miniature ${index + 1}` : `Miniature ${index + 1}`}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
