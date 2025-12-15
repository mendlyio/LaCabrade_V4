import { Metadata } from "next"
import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import HeroCarousel from "@modules/home/components/hero-carousel"
import ScrollCarousel from "@modules/common/components/scroll-carousel"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"

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
    const parentCategories = categories?.filter((c: any) => c.parent_category_id === null) || []
    mainCategories = parentCategories.slice(0, 8) || []
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error)
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
                <div className="flex gap-4 pb-4">
                  {lcEquestrianProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="flex-none w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(20%-13px)]"
                    >
                      <ProductPreview
                        region={region}
                        product={product}
                        isFeatured
                      />
                    </div>
                  ))}
                </div>
              </ScrollCarousel>
              <div className="text-center mt-8">
                <LocalizedClientLink
                  href="/categories/LC-Equestrian"
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
                {mainCategories.map((category) => (
                  <LocalizedClientLink
                    key={category.id}
                    href={`/categories/${category.handle}`}
                    className="flex-none w-[calc(100%-32px)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] group relative block overflow-hidden rounded-xl aspect-square bg-pink-50 hover:shadow-2xl transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-pink-100 transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#ac2948]/60 via-[#ac2948]/20 to-transparent group-hover:from-[#ac2948]/70 transition-all duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
                      <svg className="w-32 h-32 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </div>
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
          backgroundImage: 'url(https://images.unsplash.com/photo-1570983204499-990a64a8c629?w=1920&h=600&fit=crop)'
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="tel:+3243586099"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
                +32 (0)4/358.60.99
              </a>
              <LocalizedClientLink
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-amber-700 transition-all duration-300"
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
                <div className="flex gap-4 pb-4">
                  {outletProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="flex-none w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(20%-13px)]"
                    >
                      <ProductPreview
                        region={region}
                        product={product}
                        isFeatured
                      />
                    </div>
                  ))}
                </div>
              </ScrollCarousel>
              <div className="text-center mt-8">
                <LocalizedClientLink
                  href="/outlet"
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
