import { Metadata } from "next"
import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { buildCategoryTree } from "@lib/util/category-tree"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductCardModern from "@modules/products/components/product-card-modern"

/** IDs de la catégorie + tous ses descendants (sous-catégories) */
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
  title: "LC Equestrian - Équipements équestres de qualité | La Cabrade",
  description:
    "LC Equestrian lance son premier drop en proposant des équipements qui allient qualité, confort et prix juste. Découvrez notre propre collection.",
}

export default async function LcEquestrianPage({
  params: { countryCode },
}: {
  params: { countryCode: string }
}) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  // Uniquement la catégorie LC Equestrian (pas "la-cabrade" qui inclut d'autres produits)
  let lcCategory: { id: string } | null = null
  let allowedIds = new Set<string>()
  try {
    const categories = await listCategories() || []
    const { map: categoryMap } = buildCategoryTree(categories)
    // Seulement lc-equestrian ou lc_equestrian — jamais la-cabrade
    lcCategory =
      categories.find((c: any) => (c.handle || "").toLowerCase() === "lc-equestrian") ||
      categories.find((c: any) => (c.handle || "").toLowerCase() === "lc_equestrian") ||
      null
    if (lcCategory) {
      allowedIds = getCategoryAndDescendantIds(lcCategory.id, categoryMap)
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de la catégorie LC Equestrian:", error)
  }

  // Récupérer les produits et filtrer strictement côté client
  let products: any[] = []
  try {
    const result = await getProductsList({
      queryParams: {
        limit: 100,
        region_id: region.id,
        ...(lcCategory ? { category_id: [lcCategory.id] } : {}),
        fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+images,+categories.handle,+categories.id",
      } as any,
      countryCode,
    })
    const raw = result.response.products || []
    // Ne garder que les produits qui ont la catégorie LC Equestrian (ou ses sous-catégories)
    const isInLcEquestrian = (p: any) =>
      (p.categories || []).some((cat: any) => cat?.id && allowedIds.has(cat.id))
    products = lcCategory ? raw.filter(isInLcEquestrian) : []
  } catch (error) {
    console.error("Erreur lors de la récupération des produits LC Equestrian:", error)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-amber-600 text-white">
        <div className="content-container py-16 md:py-20">
          <div className="max-w-3xl">
            <p className="text-amber-200 text-sm font-semibold uppercase tracking-wider mb-3">
              Notre marque
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              LC Equestrian
            </h1>
            <h2 className="text-xl md:text-2xl text-white/90 font-medium mb-6">
              Créée par une cavalière pour des cavaliers
            </h2>
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              LC Equestrian lance son premier drop en proposant des équipements qui allient 
              qualité, confort et prix juste. Découvrez notre propre collection et trouvez 
              l'équipement idéal pour vous et votre compagnon.
            </p>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-5 py-2.5 rounded-lg text-sm font-semibold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              30 jours satisfait ou remboursé
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="content-container py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <LocalizedClientLink href="/" className="hover:text-amber-600 transition-colors">
              Accueil
            </LocalizedClientLink>
            <span>/</span>
            <span className="text-gray-900 font-medium">LC Equestrian</span>
          </nav>
        </div>
      </div>

      {/* Products Section */}
      <div className="content-container py-12">
        {products.length > 0 ? (
          <>
            <div className="mb-8 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {products.length} produit{products.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
              {products.map((product) => (
                <ProductCardModern
                  key={product.id}
                  region={region}
                  product={product}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Collection bientôt disponible
              </h2>
              <p className="text-gray-600 mb-8">
                Les produits LC Equestrian arrivent très prochainement. 
                Restez connecté !
              </p>
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors shadow-md"
              >
                Découvrir nos autres produits
              </LocalizedClientLink>
            </div>
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className="bg-gray-50 border-t border-gray-100 py-12">
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
      </div>
    </div>
  )
}
