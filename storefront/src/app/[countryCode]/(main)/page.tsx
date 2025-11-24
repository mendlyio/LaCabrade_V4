import { Metadata } from "next"
import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listCategories, getCategoryByHandle } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Hero from "@modules/home/components/hero"
import ProductCarousel from "@modules/common/components/product-carousel"
import CategoryCarousel from "@modules/home/components/category-carousel"
import CustomBanner from "@modules/home/components/custom-banner"

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
    return null
  }

  // 1. Récupérer les produits LC Equestrian
  let lcEquestrianProducts: any[] = []
  try {
    // Essayer de récupérer la catégorie par handle
    const { product_categories } = await getCategoryByHandle(['lc-equestrian'])
    const category = product_categories?.[0]

    if (category) {
      const result = await getProductsList({
        queryParams: {
          limit: 8,
          region_id: region.id,
          category_id: [category.id],
        },
        countryCode,
      })
      lcEquestrianProducts = result.response.products || []
    }
    
    // Fallback si la catégorie est vide ou n'existe pas: afficher les nouveautés
    if (lcEquestrianProducts.length === 0) {
       const result = await getProductsList({
        queryParams: {
          limit: 8,
          region_id: region.id,
          order: "-created_at",
        },
        countryCode,
      })
      lcEquestrianProducts = result.response.products || []
    }
  } catch (error) {
    console.error("Erreur LC Equestrian products:", error)
  }

  // 2. Récupérer les produits Outlet / Mini Prix
  let outletProducts: any[] = []
  try {
    // Idéalement on filtrerait par collection 'Outlet' ou tag. Ici on prend une sélection.
    const result = await getProductsList({
      queryParams: {
        limit: 8,
        region_id: region.id,
        // collection_id: ... (si on avait l'ID)
      },
      countryCode,
    })
    // Pour l'exemple, on inverse l'ordre pour varier si c'est le même contenu
    outletProducts = (result.response.products || []).reverse()
  } catch (error) {
    console.error("Erreur Outlet products:", error)
  }

  // 3. Récupérer les catégories principales pour les tuiles
  let mainCategories: any[] = []
  try {
    const categories = await listCategories()
    // Filtrer les catégories parentes (sans parent)
    const parents = categories.filter((c) => c.parent_category_id === null)
    mainCategories = parents.slice(0, 4)
  } catch (error) {
    console.error("Erreur Categories:", error)
  }

  return (
    <div className="w-full">
      {/* 1. Hero Carousel */}
      <Hero />

      {/* 2. Section LC Equestrian (ex-Nouveautés) */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-amber-900">
              LC Equestrian
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Découvrez notre sélection exclusive
            </p>
          </div>
          
          <ProductCarousel>
            {lcEquestrianProducts.map((product) => (
              <div
                key={product.id}
                className="w-[45%] sm:w-[40%] md:w-[30%] lg:w-[20%] flex-shrink-0 snap-center"
              >
                <ProductPreview region={region} product={product} isFeatured />
              </div>
            ))}
          </ProductCarousel>
          
          <div className="text-center mt-8">
            <LocalizedClientLink
              href="/categories/lc-equestrian"
              className="inline-block px-8 py-3 bg-amber-900 text-white font-medium rounded-full hover:bg-amber-800 transition-colors shadow-md"
            >
              Voir toute la collection
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* 3. Catégories (4 cases Carrousel) */}
      <section className="py-16 bg-gray-50">
        <div className="content-container">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Nos Univers
            </h2>
          </div>
          
          <CategoryCarousel categories={mainCategories} />
        </div>
      </section>

      {/* 4. Custom Banner 'Selle sur-mesure' */}
      <CustomBanner />

      {/* 5. Section Mini Prix (Carrousel) */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="flex items-center justify-between mb-10 px-4 md:px-0">
            <div>
              <span className="text-red-600 font-bold tracking-wider text-sm uppercase mb-2 block">
                Bonnes affaires
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Prix Mini
              </h2>
            </div>
            <LocalizedClientLink
              href="/outlet"
              className="hidden md:block px-6 py-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Tout voir
            </LocalizedClientLink>
          </div>
          
          <ProductCarousel>
            {outletProducts.map((product) => (
              <div
                key={product.id}
                className="w-[45%] sm:w-[40%] md:w-[30%] lg:w-[20%] flex-shrink-0 snap-center"
              >
                <ProductPreview region={region} product={product} isFeatured />
              </div>
            ))}
          </ProductCarousel>
          
          <div className="md:hidden text-center mt-8">
            <LocalizedClientLink
              href="/outlet"
              className="inline-block px-8 py-3 border border-gray-300 text-gray-800 font-medium rounded-full hover:bg-gray-50 transition-colors"
            >
              Tout voir
            </LocalizedClientLink>
          </div>
        </div>
      </section>
    </div>
  )
}
