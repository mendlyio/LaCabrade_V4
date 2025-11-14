"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useState } from "react"
import WishlistToggleButton from "@modules/common/components/wishlist-toggle-button"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  productId?: string
}

const ImageGallery = ({ images, productId }: ImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
        <div className="text-6xl opacity-20">📦</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Miniatures à GAUCHE (verticalement) - Desktop uniquement */}
      {images.length > 1 && (
        <div className="order-2 md:order-1 flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:max-h-[600px] pb-2 md:pb-0">
          {images.map((image, index) => (
            <button
              key={image.id || index}
              onClick={() => {
                setSelectedImage(index)
                setIsZoomed(false)
              }}
              className={`
                flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-amber-50 
                transition-all duration-300 hover:scale-105 border-2
                ${
                  selectedImage === index
                    ? 'border-amber-500 shadow-lg'
                    : 'border-gray-200 hover:border-amber-300'
                }
              `}
            >
              <Image
                src={image.url}
                alt={`Miniature ${index + 1}`}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Grande image principale */}
      <div className="order-1 md:order-2 flex-1 relative group">
        <div 
          className={`relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-amber-50 shadow-lg ${
            isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <Image
            src={images[selectedImage].url}
            alt={`Image produit ${selectedImage + 1}`}
            fill
            className={`object-cover transition-all duration-500 ${
              isZoomed ? 'scale-150' : 'scale-100 group-hover:scale-105'
            }`}
            sizes="(max-width: 768px) 100vw, 60vw"
            priority={selectedImage === 0}
          />

          {/* Wishlist en overlay TOP-RIGHT sur l'image */}
          {productId && (
            <div className="absolute top-4 right-4 z-10">
              <WishlistToggleButton productId={productId} size="lg" />
            </div>
          )}

          {/* Compteur d'images */}
          {images.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
              {selectedImage + 1} / {images.length}
            </div>
          )}

          {/* Hint de zoom */}
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            {isZoomed ? 'Cliquez pour dézoomer' : 'Cliquez pour zoomer'}
          </div>
        </div>

        {/* Flèches de navigation - Mobile uniquement */}
        {images.length > 1 && (
          <div className="md:hidden">
            <button
              onClick={() => setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white"
              aria-label="Image précédente"
            >
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white"
              aria-label="Image suivante"
            >
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImageGallery
