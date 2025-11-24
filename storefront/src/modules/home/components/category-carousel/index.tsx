"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "@medusajs/icons"

type CategoryCarouselProps = {
  categories: any[]
}

// Fallback images if category has no image
const getCategoryImage = (index: number) => {
  const images = [
    "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=2071&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1534056237980-891d42e1785b?q=80&w=2073&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1598556820883-1760c2e45639?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551887196-7284688d87dc?q=80&w=2070&auto=format&fit=crop"
  ]
  return images[index % images.length]
}

const CategoryCarousel = ({ categories }: CategoryCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef
      const scrollAmount = direction === 'left' ? -300 : 300
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
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

  if (!categories.length) return null

  return (
    <div className="relative group">
       {/* Navigation Buttons - Desktop */}
       <div className="hidden lg:block">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-amber-600 hover:scale-110 transition-all border border-gray-100"
          >
            <ChevronLeft />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-amber-600 hover:scale-110 transition-all border border-gray-100"
          >
            <ChevronRight />
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0"
      >
        {categories.map((category, index) => (
          <LocalizedClientLink
            key={category.id}
            href={`/categories/${category.handle}`}
            className="min-w-[280px] w-[80%] sm:w-[45%] lg:w-[23%] flex-shrink-0 snap-center relative h-80 rounded-xl overflow-hidden group/card shadow-md hover:shadow-xl transition-all duration-300"
          >
            {/* Background Image - Use 1st product image if available (handled by caller usually, but here we mock/fallback) */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
              style={{ backgroundImage: `url(${getCategoryImage(index)})` }}
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover/card:opacity-90 transition-opacity" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-center transform translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300">
              <h3 className="text-xl font-bold text-white mb-2">
                {category.name}
              </h3>
              <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full border border-white/30 hover:bg-white hover:text-black transition-all">
                Découvrir
              </span>
            </div>
          </LocalizedClientLink>
        ))}
      </div>
    </div>
  )
}

export default CategoryCarousel

