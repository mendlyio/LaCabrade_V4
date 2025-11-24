"use client"

import { ProductPreviewType } from "@types/global"
import { Region } from "@medusajs/medusa"
import ProductPreview from "@modules/products/components/product-preview"
import { useRef, useState } from "react"
import { Button } from "@medusajs/ui"
import { ChevronLeft, ChevronRight } from "@medusajs/icons"

type ProductCarouselProps = {
  products: ProductPreviewType[]
  region: Region
}

const ProductCarousel = ({ products, region }: ProductCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef
      const scrollAmount = direction === 'left' ? -300 : 300
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
      
      // Update buttons state after scroll
      setTimeout(() => {
        setCanScrollLeft(current.scrollLeft > 0)
        setCanScrollRight(
          current.scrollLeft < current.scrollWidth - current.clientWidth - 10
        )
      }, 300)
    }
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const { current } = scrollRef
      setCanScrollLeft(current.scrollLeft > 0)
      setCanScrollRight(
        current.scrollLeft < current.scrollWidth - current.clientWidth - 10
      )
    }
  }

  if (!products.length) return null

  return (
    <div className="relative group">
      {/* Navigation Buttons - Desktop */}
      <div className="hidden lg:block">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-amber-600 hover:scale-110 transition-all border border-gray-100"
            aria-label="Previous"
          >
            <ChevronLeft />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-amber-600 hover:scale-110 transition-all border border-gray-100"
            aria-label="Next"
          >
            <ChevronRight />
          </button>
        )}
      </div>

      {/* Carousel Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-x-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[45%] sm:w-[40%] md:w-[30%] lg:w-[20%] flex-shrink-0 snap-center"
          >
            <ProductPreview region={region} product={product} isFeatured />
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProductCarousel

