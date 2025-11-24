"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button } from "@medusajs/ui"

const CustomBanner = () => {
  return (
    <section className="relative h-[500px] w-full overflow-hidden my-16">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1540965555-6f5a39752a29?q=80&w=2070&auto=format&fit=crop')" // Saddle/Leather craftsmanship image
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="content-container w-full">
          <div className="max-w-2xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-wide drop-shadow-lg">
              Selle sur-mesure
            </h2>
            <p className="text-xl md:text-2xl mb-10 font-light text-gray-100 drop-shadow-md">
              L'harmonie parfaite entre le cavalier et sa monture
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="tel:+32472557357"
                className="w-full sm:w-auto px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                0472/55.73.57
              </a>
              
              <LocalizedClientLink href="/contact" className="w-full sm:w-auto">
                <Button 
                  variant="secondary" 
                  className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black px-8 py-3 text-base font-semibold rounded-full transition-all"
                >
                  Contact
                </Button>
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CustomBanner

