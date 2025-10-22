import { Metadata } from "next"
import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import ProductPreview from "@modules/products/components/product-preview"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

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
  
  console.log("🌍 Région récupérée:", region?.id, "pour pays:", countryCode)
  
  if (!region) {
    console.error("❌ Aucune région trouvée pour:", countryCode)
    return null
  }

  // Récupérer les nouveautés (8 derniers produits ajoutés)
  let newProducts: any[] = []
  try {
    const result = await getProductsList({
      queryParams: {
        limit: 8,
        region_id: region.id,
        order: "-created_at", // Trier par date de création décroissante
      },
      countryCode,
    })
    console.log("🔍 Nouveautés récupérées:", result.response.products?.length || 0, "produits")
    newProducts = result.response.products || []
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des nouveautés:", error)
  }

  // Récupérer les produits en promotion/outlet (mêmes produits pour l'instant)
  let outletProducts: any[] = []
  try {
    const result = await getProductsList({
      queryParams: {
        limit: 8,
        region_id: region.id,
      },
      countryCode,
    })
    console.log("🔍 Produits outlet récupérés:", result.response.products?.length || 0, "produits")
    outletProducts = result.response.products || []
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des produits outlet:", error)
  }

  // Récupérer les catégories
  let mainCategories: any[] = []
  try {
    const categories = await listCategories()
    mainCategories = categories?.slice(0, 4) || []
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error)
  }

  // Récupérer les collections/marques
  let collections: any[] = []
  try {
    const result = await getCollectionsList(0, 8)
    collections = result.collections || []
  } catch (error) {
    console.error("Erreur lors de la récupération des collections:", error)
  }

  return (
    <div className="w-full">
      {/* Hero Section LC•EQUESTRIAN */}
      <section className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/horse-pattern.svg')] opacity-5"></div>
        <div className="content-container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold mb-4">
                Nouvelle Collection
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 bg-clip-text text-transparent">
                LC•EQUESTRIAN
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-4 font-light">
              Créée par une cavalière pour des cavaliers
            </p>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Vivez l'<strong>équitation comme vous l'aimez</strong>, sans compromis.<br />
              Des prix justes, du matériel fiable, et surtout, toute l'émotion d'une sellerie pensée pour les passionnés.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <LocalizedClientLink
                href="/store"
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Découvrir la collection →
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/marques"
                className="px-8 py-4 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-all duration-300 border-2 border-amber-200 hover:border-amber-300"
              >
                Nos Marques
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </section>

      {/* Section Nouveautés */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Nos nouveautés</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Vivez l'<strong>équitation comme vous l'aimez</strong>, sans compromis.<br />
              Des prix justes, du matériel fiable, et surtout, toute l'émotion d'une sellerie pensée pour les passionnés.
            </p>
          </div>
          {newProducts.length > 0 ? (
            <>
              <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {newProducts.slice(0, 8).map((product) => (
                  <li key={product.id} className="group">
                    <ProductPreview region={region} product={product} isFeatured />
                  </li>
                ))}
              </ul>
              <div className="text-center">
                <LocalizedClientLink
                  href="/nouveautes"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  C'est pour moi !
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </LocalizedClientLink>
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <div className="mb-6">
                <svg className="w-20 h-20 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Nouveautés en préparation</h3>
              <p className="text-gray-600 mb-6">
                Nos dernières nouveautés arrivent bientôt !<br />
                Revenez nous voir prochainement.
              </p>
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300"
              >
                Découvrir nos produits
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </LocalizedClientLink>
            </div>
          )}
        </div>
      </section>

      {/* Section Prix Mini / Outlet */}
      <section className="py-16 bg-gradient-to-br from-red-50 to-orange-50">
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
              <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                {outletProducts.slice(0, 8).map((product) => (
                  <li key={product.id} className="group">
                    <ProductPreview region={region} product={product} isFeatured />
                  </li>
                ))}
              </ul>
              <div className="text-center">
                <LocalizedClientLink
                  href="/promotions"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  C'est pour moi !
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

      {/* Section Catégories */}
      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Notre gamme variée</h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              <strong>Nos vêtements vous accompagnent à l'écurie</strong>, en concours, ou en ville, 
              avec la même exigence : vous offrir des tenues qui bougent avec vous, qui durent dans le temps, 
              et qui traduisent votre amour du cheval dans chaque couture.
            </p>
          </div>
          {mainCategories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {mainCategories.map((category) => (
                <LocalizedClientLink
                  key={category.id}
                  href={`/categories/${category.handle}`}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-8 text-center hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-amber-300"
                >
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 transition-colors mb-2">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2 group-hover:text-gray-700">
                      Découvrir
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/10 group-hover:to-orange-500/10 transition-all duration-300"></div>
                </LocalizedClientLink>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <p className="text-gray-600">
                Nos catégories de produits arrivent prochainement.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Section Marques */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="content-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Nos marques</h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              Sélectionnées rien que pour vous
            </p>
            <p className="text-gray-600 mt-4 max-w-3xl mx-auto">
              Explorez notre sélection de marques renommées dans notre sellerie à Fléron, près de Liège. 
              Nous collaborons avec les meilleurs fournisseurs d'équipements d'équitation pour offrir qualité et innovation 
              à chaque cavalier et monture.
            </p>
          </div>
          {collections.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {collections.slice(0, 12).map((brand) => (
                  <LocalizedClientLink
                    key={brand.id}
                    href={`/collections/${brand.handle}`}
                    className="bg-white p-6 rounded-lg text-center hover:shadow-lg hover:scale-105 transition-all duration-300 border border-gray-200 hover:border-amber-300 group"
                  >
                    <p className="font-semibold text-gray-800 group-hover:text-amber-600 transition-colors">
                      {brand.title}
                    </p>
                  </LocalizedClientLink>
                ))}
              </div>
              <div className="text-center">
                <LocalizedClientLink
                  href="/marques"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Nos marques
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </LocalizedClientLink>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-600">
                Nos marques partenaires arrivent prochainement.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Selle sur mesure */}
      <section className="py-16 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600">
        <div className="content-container">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Votre selle sur mesure Equipe vous attend.
            </h2>
            <p className="text-xl mb-8 text-amber-50">
              Prenez rendez-vous pour une consultation personnalisée
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="tel:+32472557357"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
                +32 (0) 472/55.73.57
              </a>
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-amber-700 transition-all duration-300"
              >
                Découvrir nos selles
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
