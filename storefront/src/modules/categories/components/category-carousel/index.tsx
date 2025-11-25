import LocalizedClientLink from "@modules/common/components/localized-client-link"

type CategoryCarouselProps = {
  categories: any[] // Type de catégorie Medusa
}

const CategoryCarousel = ({ categories }: CategoryCarouselProps) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune catégorie disponible
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Carrousel horizontal scrollable */}
      <div className="overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 px-4">
        <div className="flex gap-6 pb-4">
          {categories.map((category) => (
            <LocalizedClientLink
              key={category.id}
              href={`/categories/${category.handle}`}
              className="flex-none w-[calc(100%-32px)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] group relative block overflow-hidden rounded-xl aspect-square bg-gradient-to-br from-amber-100 to-orange-100 hover:shadow-2xl transition-all duration-300"
            >
              {/* Image de fond - dégradé par défaut */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-100 to-amber-50 transition-transform duration-500 group-hover:scale-105" />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-amber-900/60 via-amber-900/20 to-transparent group-hover:from-amber-900/70 transition-all duration-300" />
              
              {/* Icône décorative */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
                <svg className="w-32 h-32 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              
              {/* Contenu */}
              <div className="absolute inset-0 flex flex-col items-center justify-end p-6 text-center">
                <h3 className="text-xl md:text-2xl font-bold text-amber-900 mb-2 drop-shadow-lg">
                  {category.name}
                </h3>
                <p className="text-sm text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
                  Découvrir →
                </p>
              </div>
            </LocalizedClientLink>
          ))}
        </div>
      </div>

      {/* Indicateur de scroll */}
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
    </div>
  )
}

export default CategoryCarousel
