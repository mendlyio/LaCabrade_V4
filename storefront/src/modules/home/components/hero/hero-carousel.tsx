"use client"

import { useState, useEffect, useRef } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button } from "@medusajs/ui"

const slides = [
  {
    id: 1,
    title: "Nouvelle Collection",
    subtitle: "Découvrez nos dernières arrivées",
    buttonText: "Nouveautés",
    link: "/nouveautes",
    image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=2071&auto=format&fit=crop", // Horse jumping/riding
    color: "from-amber-900/80 to-black/40"
  },
  {
    id: 2,
    title: "LC Equestrian",
    subtitle: "L'excellence pour votre cheval",
    buttonText: "LC Equestrian",
    link: "/categories/lc-equestrian",
    image: "https://images.unsplash.com/photo-1534056237980-891d42e1785b?q=80&w=2073&auto=format&fit=crop", // Horse close up
    color: "from-stone-900/80 to-stone-800/40"
  },
  {
    id: 3,
    title: "Outlet",
    subtitle: "Profitez de nos meilleures offres",
    buttonText: "Outlet",
    link: "/outlet",
    image: "https://images.unsplash.com/photo-1598556820883-1760c2e45639?q=80&w=2070&auto=format&fit=crop", // Tack room or equipment
    color: "from-red-900/80 to-black/40"
  }
]

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToSlide = (index: number) => {
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.offsetWidth
      scrollContainerRef.current.scrollTo({
        left: width * index,
        behavior: "smooth",
      })
      setCurrentSlide(index)
    }
  }

  // Handle scroll events to update active dot
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.offsetWidth
      const scrollLeft = scrollContainerRef.current.scrollLeft
      const newIndex = Math.round(scrollLeft / width)
      if (newIndex !== currentSlide) {
        setCurrentSlide(newIndex)
      }
    }
  }

  // Auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      const nextSlide = (currentSlide + 1) % slides.length
      scrollToSlide(nextSlide)
    }, 6000)

    return () => clearInterval(interval)
  }, [currentSlide])

  return (
    <div className="relative w-full h-[60vh] min-h-[500px] max-h-[800px] group">
      {/* Carousel Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
      >
        {slides.map((slide, index) => (
          <div 
            key={slide.id} 
            className="relative min-w-full h-full snap-center flex items-center justify-center overflow-hidden"
          >
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transform transition-transform duration-[2000ms] hover:scale-105"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            
            {/* Overlay Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.color}`} />

            {/* Content */}
            <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto animate-fade-in-top">
              <h2 className="text-lg md:text-xl font-medium mb-2 uppercase tracking-widest opacity-90">
                {slide.subtitle}
              </h2>
              <h1 className="text-4xl md:text-6xl font-bold mb-8 drop-shadow-lg">
                {slide.title}
              </h1>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <LocalizedClientLink href={slide.link}>
                  <Button 
                    variant="primary" 
                    className="bg-white text-black hover:bg-gray-100 border-none px-8 py-3 text-base font-semibold rounded-full transition-all hover:scale-105 shadow-xl min-w-[200px]"
                  >
                    {slide.buttonText}
                  </Button>
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentSlide === index 
                ? "bg-white w-8" 
                : "bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Aller à la slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Absolute Buttons Container - As requested: "3 boutons" typically implies quick access */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pb-8 pt-16 lg:hidden">
        <div className="flex justify-center gap-4 px-4 overflow-x-auto no-scrollbar snap-x">
           {/* This section is just for mobile quick access if needed, but the slides already have buttons. 
               Keeping it clean for now as slides have the main CTA. 
           */}
        </div>
      </div>
    </div>
  )
}

export default HeroCarousel

