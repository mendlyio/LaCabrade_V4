"use client"

import { useRef, useState, ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "@medusajs/icons"

type ProductCarouselProps = {
  children: ReactNode
}

const ProductCarousel = ({ children }: ProductCarouselProps) => {
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

  if (!children) return null

  return (
    <div className="relative group">
      {/* Navigation Buttons - Desktop */}
      <div className="hidden lg:block">
        <button
          onClick={() => scroll('left')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-amber-600 hover:scale-110 transition-all border border-gray-100 ${!canScrollLeft ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          aria-label="Previous"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={() => scroll('right')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-amber-600 hover:scale-110 transition-all border border-gray-100 ${!canScrollRight ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          aria-label="Next"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Carousel Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-x-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0"
      >
        {children}
      </div>
    </div>
  )
}

export default ProductCarousel

