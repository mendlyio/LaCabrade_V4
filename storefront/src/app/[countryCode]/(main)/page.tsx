import { Metadata } from "next"
import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { slugify } from "@lib/util/slugify"
import HeroCarousel from "@modules/home/components/hero-carousel"
import ScrollCarousel from "@modules/common/components/scroll-carousel"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductCardModern from "@modules/products/components/product-card-modern"

export const metadata: Metadata = {
  title: "La Cabrade - Sellerie Équestre | LC•EQUESTRIAN",
  description:
    "Vivez l'équitation comme vous l'aimez, sans compromis. Des prix justes, du matériel fiable, et toute l'émotion d'une sellerie pensée pour les passionnés.",
}

export default async function Home({
  params: { countryCode },
}: {
  params: { countryCode: string }
}) {
  const region = await getRegion(countryCode)
  
  if (!region) {
    console.error("❌ Aucune région trouvée pour:", countryCode)
    return null
  }

  // Récupérer les produits LC Equestrian
  let lcEquestrianProducts: any[] = []
  try {
    const result = await getProductsList({
      queryParams: {
        limit: 8,
        region_id: region.id,
      },
      countryCode,
    })
    lcEquestrianProducts = result.response.products || []
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des produits:", error)
  }

  // Récupérer les produits outlet
  let outletProducts: any[] = []
  try {
    const result = await getProductsList({
      queryParams: {
        limit: 8,
        region_id: region.id,
      },
      countryCode,
    })
    outletProducts = result.response.products || []
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des produits outlet:", error)
  }

  // Récupérer les catégories
  let mainCategories: any[] = []
  try {
    const categories = await listCategories()
    const parentCategories =
      categories?.filter(
        (c: any) => c.parent_category_id == null && c.is_active !== false
      ) || []
    mainCategories = parentCategories.slice(0, 8) || []
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error)
  }

  const categoryImages: Record<string, string> = {
    cheval: "https://ik.imagekit.io/kodt9cn6f/Cabrade/cheval.webp",
    cavalier: "https://ik.imagekit.io/kodt9cn6f/Cabrade/cavalier.webp",
    "soin-et-alimentation":
      "https://ik.imagekit.io/kodt9cn6f/Cabrade/soin%20et%20alimentation.webp?updatedAt=1770375198653",
    "soins-et-alimentation":
      "https://ik.imagekit.io/kodt9cn6f/Cabrade/soin%20et%20alimentation.webp?updatedAt=1770375198653",
    "son-et-alimentation":
      "https://ik.imagekit.io/kodt9cn6f/Cabrade/soin%20et%20alimentation.webp?updatedAt=1770375198653",
    ecurie: "https://ik.imagekit.io/kodt9cn6f/Cabrade/ecurie.webp",
    outlet: "https://ik.imagekit.io/kodt9cn6f/Cabrade/outlet.webp",
  }

  const getCategoryImage = (category: any) => {
    const handleKey = category?.handle ? slugify(category.handle) : ""
    const nameKey = category?.name ? slugify(category.name) : ""
    return categoryImages[handleKey] || categoryImages[nameKey] || ""
  }

  return (
    <div className="w-full">
      {/* Hero Carrousel */}
      <HeroCarousel />

      {/* Section LC Equestrian avec scroll horizontal */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-amber-600">
                LC Equestrian
              </span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Créée par une cavalière pour des cavaliers. Découvrez notre collection exclusive.
            </p>
          </div>
          {lcEquestrianProducts.length > 0 ? (
            <>
              <ScrollCarousel className="-mx-4 px-4">
                <div className="flex gap-3 sm:gap-4 pb-4">
                  {lcEquestrianProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="flex-none w-[calc(50%-6px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)] xl:w-[calc(20%-13px)]"
                    >
                      <ProductCardModern
                        region={region}
                        product={product}
                      />
                    </div>
                  ))}
                </div>
              </ScrollCarousel>
              <div className="text-center mt-8">
                <LocalizedClientLink
                  href="/categories/lc-equestrian"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Voir toute la collection
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </LocalizedClientLink>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <p className="text-gray-600 mb-6">
                La collection LC Equestrian arrive bientôt !
              </p>
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300"
              >
                Découvrir nos autres produits
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </LocalizedClientLink>
            </div>
          )}
        </div>
      </section>

      {/* Section Catégories */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="content-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Nos catégories</h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              Explorez notre gamme complète d'équipements équestres
            </p>
          </div>
          {mainCategories.length > 0 ? (
            <ScrollCarousel className="-mx-4 px-4">
              <div className="flex gap-6 pb-4">
                {mainCategories.map((category) => {
                  const categoryImage = getCategoryImage(category)
                  return (
                  <LocalizedClientLink
                    key={category.id}
                    href={`/categories/${category.handle}`}
                    className="flex-none w-[calc(100%-32px)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] group/card relative block overflow-hidden rounded-2xl aspect-square bg-gray-200 shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-xl"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-[1.03]"
                      style={{
                        backgroundImage: categoryImage ? `url(${categoryImage})` : undefined,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-left">
                      <h3 className="text-lg md:text-xl font-semibold text-white drop-shadow">
                        {category.name}
                      </h3>
                      <div className="mt-2 inline-flex items-center gap-2 text-sm text-white/90 font-medium opacity-0 translate-y-2 transition-all duration-300 group-hover/card:opacity-100 group-hover/card:translate-y-0">
                        Découvrir
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                </LocalizedClientLink>
                  )
                })}
            </div>
          </ScrollCarousel>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-600">
                Nos catégories de produits arrivent prochainement.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Bandeau Selle sur-mesure */}
      <section 
        className="relative py-24 md:py-32 bg-cover bg-center overflow-hidden"
        style={{
          backgroundImage: 'url(https://ik.imagekit.io/kodt9cn6f/Cabrade/selles-sur-mesure.webp)'
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="content-container relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-2xl">
              Selle sur-mesure
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-white/90 drop-shadow-lg">
              Votre selle Equipe vous attend. Prenez rendez-vous pour une consultation personnalisée 
              et trouvez la selle parfaite pour vous et votre cheval.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <a
                href="tel:+3243586099"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base w-auto"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
                +32 (0)4/358.60.99
              </a>
              <LocalizedClientLink
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-amber-700 transition-all duration-300 text-sm sm:text-base w-auto"
              >
                Contact
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </section>

      {/* Section Prix Mini / Outlet */}
      <section className="py-16 bg-red-50">
        <div className="content-container">
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                OUTLET
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Prix mini</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Notre sélection d'articles à prix tout doux
            </p>
          </div>
          {outletProducts.length > 0 ? (
            <>
              <ScrollCarousel className="-mx-4 px-4">
                <div className="flex gap-3 sm:gap-4 pb-4">
                  {outletProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="flex-none w-[calc(50%-6px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)] xl:w-[calc(20%-13px)]"
                    >
                      <ProductCardModern
                        region={region}
                        product={product}
                      />
                    </div>
                  ))}
                </div>
              </ScrollCarousel>
              <div className="text-center mt-8">
                <LocalizedClientLink
                  href="/categories/outlet"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Voir tous les outlets
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </LocalizedClientLink>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-600 mb-6">
                Nos promotions arrivent bientôt !<br />
                Surveillez cette section pour ne rien manquer.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
