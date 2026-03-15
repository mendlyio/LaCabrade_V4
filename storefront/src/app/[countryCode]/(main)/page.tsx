import { Metadata } from "next"
import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { buildCategoryTree } from "@lib/util/category-tree"
import { slugify } from "@lib/util/slugify"
import HeroCarousel from "@modules/home/components/hero-carousel"
import ScrollCarousel from "@modules/common/components/scroll-carousel"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductCardModern from "@modules/products/components/product-card-modern"

/** IDs de la catégorie + tous ses descendants */
function getCategoryAndDescendantIds(categoryId: string, categoryMap: Map<string, any>): Set<string> {
  const ids = new Set<string>([categoryId])
  const stack = [categoryId]
  while (stack.length) {
    const id = stack.pop()!
    const node = categoryMap.get(id)
    node?.category_children?.forEach((child: any) => {
      if (child?.id) {
        ids.add(child.id)
        stack.push(child.id)
      }
    })
  }
  return ids
}

export const metadata: Metadata = {
  title: "La Cabrade - Sellerie Équestre | LC•EQUESTRIAN",
  description:
    "Vivez l'équitation comme vous l'aimez, sans compromis. Des prix justes, du matériel fiable, et toute l'émotion d'une sellerie pensée pour les passionnés.",
}

// Revalidation pour que les mises à jour (ex: slider CTA) soient prises en compte
export const revalidate = 60

export default async function Home({
  params: { countryCode },
}: {
  params: { countryCode: string }
}) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  // Récupérer les catégories d'abord (pour filtrer par catégorie)
  let allCategories: any[] = []
  try {
    allCategories = await listCategories() || []
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error)
  }

  // Trouver la catégorie LC Equestrian
  const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]
  const lcCategory = allCategories.find((c: any) =>
    LC_EQUESTRIAN_HANDLES.includes((c.handle || "").toLowerCase())
  )

  const { map: categoryMap } = buildCategoryTree(allCategories)

  // Récupérer les produits LC Equestrian — uniquement catégorie LC-Equestrian (et sous-catégories)
  let lcEquestrianProducts: any[] = []
  if (lcCategory) {
    try {
      const allowedIds = getCategoryAndDescendantIds(lcCategory.id, categoryMap)
      const result = await getProductsList({
        queryParams: {
          limit: 48,
          region_id: region.id,
          category_id: [lcCategory.id],
          fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+images,+categories.handle,+categories.id",
        } as any,
        countryCode,
      })
      const raw = result.response.products || []
      const isInLcCategory = (p: any) =>
        (p.categories || []).some((cat: any) => cat?.id && allowedIds.has(cat.id))
      lcEquestrianProducts = raw.filter(isInLcCategory).slice(0, 8)
    } catch (error) {
      console.error("Erreur lors de la récupération des produits LC Equestrian:", error)
    }
  }

  // Récupérer les nouveautés — produits triés par date de création (plus récents en premier)
  let newProducts: any[] = []
  try {
    const result = await getProductsList({
      queryParams: {
        limit: 8,
        region_id: region.id,
        order: "-created_at",
        fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+images,+categories.handle,+categories.id",
      } as any,
      countryCode,
    })
    newProducts = result.response.products || []
  } catch (error) {
    console.error("Erreur lors de la récupération des nouveautés:", error)
  }

  // Filtrer les catégories principales pour la section catégories
  const parentCategories = allCategories.filter(
    (c: any) => c.parent_category_id == null && c.is_active !== false
  )
  // Outlet en dernière position
  const sorted = [...parentCategories].sort((a: any, b: any) => {
    const aIsOutlet = (a.handle || "").toLowerCase() === "outlet"
    const bIsOutlet = (b.handle || "").toLowerCase() === "outlet"
    if (aIsOutlet && !bIsOutlet) return 1
    if (!aIsOutlet && bIsOutlet) return -1
    return 0
  })
  const mainCategories = sorted.slice(0, 8)

  const categoryImages: Record<string, string> = {
    cheval: "https://ik.imagekit.io/kodt9cn6f/cheval.webp",
    cavalier: "https://ik.imagekit.io/kodt9cn6f/Cabrade/cavalier.webp",
    "soin-et-alimentation":
      "https://ik.imagekit.io/kodt9cn6f/soins.webp",
    "soins-et-alimentation":
      "https://ik.imagekit.io/kodt9cn6f/soins.webp",
    "son-et-alimentation":
      "https://ik.imagekit.io/kodt9cn6f/soins.webp",
    ecurie: "https://ik.imagekit.io/kodt9cn6f/ecurie.webp",
    outlet: "https://ik.imagekit.io/kodt9cn6f/Cabrade/outlet.webp",
    "lc-equestrian": "https://ik.imagekit.io/kodt9cn6f/Cabrade/Lc-equestrian.webp",
    "la-cabrade": "https://ik.imagekit.io/kodt9cn6f/Cabrade/Lc-equestrian.webp",
  }

  const getCategoryImage = (category: any) => {
    const handleKey = category?.handle ? slugify(category.handle) : ""
    const nameKey = category?.name ? slugify(category.name) : ""
    return categoryImages[handleKey] || categoryImages[nameKey] || ""
  }

  return (
    <div className="w-full">
      <h1 className="sr-only">La Cabrade - Sellerie Équestre &amp; LC Equestrian</h1>
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
                  href="/lc-equestrian"
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
                  const handle = category?.handle
                  if (!handle) return null
                  return (
                  <LocalizedClientLink
                    key={category.id}
                    href={`/categories/${encodeURIComponent(handle)}`}
                    className="flex-none w-[calc(100%-32px)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] group/card relative block overflow-hidden rounded-2xl aspect-square bg-gray-200 shadow-sm ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-xl cursor-pointer"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-[1.03] pointer-events-none"
                      style={{
                        backgroundImage: categoryImage ? `url(${categoryImage})` : undefined,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
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

      {/* Section Icônes Info */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="content-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Livraison gratuite</h3>
              <p className="text-xs text-gray-500">à partir de 75 €</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Envoi rapide</h3>
              <p className="text-xs text-gray-500">48-72h en Belgique</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Service après-vente</h3>
              <p className="text-xs text-gray-500">Retours 30 jours</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">6 points d'enlèvement</h3>
              <p className="text-xs text-gray-500">Livraison gratuite</p>
            </div>
          </div>
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

      {/* Section Nouveautés */}
      <section className="py-16 bg-gray-50">
        <div className="content-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Nouveautés</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Découvrez nos derniers produits équestres
            </p>
          </div>
          {newProducts.length > 0 ? (
            <>
              <ScrollCarousel className="-mx-4 px-4">
                <div className="flex gap-3 sm:gap-4 pb-4">
                  {newProducts.map((product) => (
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
                  href="/nouveautes"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Voir toutes les nouveautés
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </LocalizedClientLink>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-600 mb-6">
                Nos nouveautés arrivent bientôt !<br />
                Surveillez cette section pour ne rien manquer.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
