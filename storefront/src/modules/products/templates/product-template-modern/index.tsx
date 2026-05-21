import React, { Suspense } from "react"
import { HttpTypes } from "@medusajs/types"
import { notFound } from "next/navigation"
import ImageGalleryModern from "@modules/products/components/image-gallery-modern"
import ProductInfoModern from "@modules/products/components/product-info-modern"
import ProductActionsModern from "@modules/products/components/product-actions-modern"
import RelatedProductsModern from "@modules/products/components/related-products-modern"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import ViewItemTracker from "@modules/common/components/tracking/view-item-tracker"
import ProductJsonLd from "@modules/common/components/json-ld/product-jsonld"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { listCategories } from "@lib/data/categories"
import { buildCategoryTree } from "@lib/util/category-tree"
import { getProductStockInfo } from "@lib/util/product-stock"

type ProductTemplateModernProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
}

const ProductTemplateModern = async ({
  product,
  region,
  countryCode,
}: ProductTemplateModernProps) => {
  if (!product || !product.id) {
    return notFound()
  }

  let allCategories: HttpTypes.StoreProductCategory[] = []
  try {
    allCategories = (await listCategories()) || []
  } catch (error) {
    console.error("Erreur lors du chargement des catégories:", error)
    allCategories = []
  }
  const { map: categoryMap } = buildCategoryTree(allCategories)

  const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]
  const lcEquestrianCategoryId =
    allCategories.find((c) =>
      LC_EQUESTRIAN_HANDLES.includes((c.handle ?? "").toLowerCase())
    )?.id ?? null

  const buildCategoryBreadcrumb = () => {
    if (!product.categories?.length || categoryMap.size === 0) {
      return []
    }

    const getPath = (categoryId: string) => {
      const path: HttpTypes.StoreProductCategory[] = []
      const visited = new Set<string>()
      let current = categoryMap.get(categoryId)

      while (current && !visited.has(current.id)) {
        path.unshift(current)
        visited.add(current.id)
        const parentId =
          current.parent_category_id || current.parent_category?.id || undefined
        current = parentId ? categoryMap.get(parentId) : undefined
      }

      return path
    }

    const paths = product.categories
      .map((category) => getPath(category.id))
      .filter((path) => path.length > 0)

    if (!paths.length) {
      return []
    }

    return paths.sort((a, b) => b.length - a.length)[0]
  }

  const categoryBreadcrumb = buildCategoryBreadcrumb()

  // Outlet : vérifier si le produit est dans outlet ou une sous-catégorie (via ancêtres)
  const allPaths = (product.categories || [])
    .map((c) => {
      const path: HttpTypes.StoreProductCategory[] = []
      let current = categoryMap.get(c.id)
      const visited = new Set<string>()
      while (current && !visited.has(current.id)) {
        path.unshift(current)
        visited.add(current.id)
        const parentId = current.parent_category_id || (current as any).parent_category?.id
        current = parentId ? categoryMap.get(parentId) : undefined
      }
      return path
    })
    .filter((p) => p.length > 0)
  const isOutlet =
    allPaths.some((path) =>
      path.some((cat) => (cat.handle || "").toLowerCase().startsWith("outlet"))
    ) ||
    // Fallback : metadata.odoo_category (sync Odoo) ou catégorie Medusa assignée manuellement
    (product.metadata?.odoo_category &&
      String(product.metadata.odoo_category).toLowerCase().includes("outlet"))

  // Vérifier si le produit est en promotion
  const hasDiscount = product.variants?.some((v) => {
    const calculated = v.calculated_price?.calculated_amount
    const original = v.calculated_price?.original_amount
    return typeof calculated === "number" && typeof original === "number" && calculated < original
  })

  // Vérifier le stock (fallback: inventory_quantity null/undefined → supposer en stock)
  const variants = product.variants || []
  const { isInStock, isLowStock: lowStock, totalAvailable } = getProductStockInfo(variants)

  // Vérifier les metadata pour les pastilles NEW et PROMO
  const isNew = product.metadata?.is_new === true || product.metadata?.is_new === "true"
  const newUntil = product.metadata?.new_until ? new Date(product.metadata.new_until as string).getTime() : null
  const showNewBadge = isNew && (!newUntil || Date.now() < newUntil)
  const isPromo = product.metadata?.is_promo === true || product.metadata?.is_promo === "true"

  // Estimation de livraison — en jours ouvrables (lun-ven), week-ends ignorés.
  // Si commande passée après 14h, on décale le point de départ d'un jour ouvrable
  // (préparation possible le lendemain ouvré).
  const addBusinessDays = (from: Date, days: number) => {
    const d = new Date(from)
    let remaining = days
    while (remaining > 0) {
      d.setDate(d.getDate() + 1)
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) remaining--
    }
    return d
  }
  const today = new Date()
  // Point de départ pour la préparation : aujourd'hui si jour ouvré avant 14h,
  // sinon prochain jour ouvré.
  const isWeekend = today.getDay() === 0 || today.getDay() === 6
  const afterCutoff = today.getHours() >= 14
  const prepStart = isWeekend || afterCutoff ? addBusinessDays(today, 1) : today
  const deliveryMin = addBusinessDays(prepStart, 2)
  const deliveryMax = addBusinessDays(prepStart, 4)
  const formatDate = (d: Date) =>
    d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })

  // SKU du premier variant
  const sku = product.variants?.[0]?.sku

  return (
    <div className="bg-white min-h-screen">
      <ProductJsonLd
        product={product}
        countryCode={countryCode}
        breadcrumb={categoryBreadcrumb.map((c) => ({
          name: c.name,
          handle: c.handle,
        }))}
      />
      <ViewItemTracker product={product} listName={categoryBreadcrumb[0]?.name} />
      {/* Breadcrumbs */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="content-container py-3">
          <nav className="flex items-center flex-wrap gap-1.5 text-xs sm:text-sm">
            <LocalizedClientLink
              href="/"
              className="text-gray-400 hover:text-amber-600 transition-colors"
            >
              Accueil
            </LocalizedClientLink>

            {categoryBreadcrumb.length > 0 ? (
              categoryBreadcrumb.map((category) => (
                <span key={category.id} className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <LocalizedClientLink
                    href={`/categories/${encodeURIComponent(category.handle)}`}
                    className="text-gray-400 hover:text-amber-600 transition-colors whitespace-nowrap"
                  >
                    {category.name}
                  </LocalizedClientLink>
                </span>
              ))
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <LocalizedClientLink
                  href="/store"
                  className="text-gray-400 hover:text-amber-600 transition-colors"
                >
                  Boutique
                </LocalizedClientLink>
              </span>
            )}

            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-gray-700 truncate max-w-[200px] sm:max-w-xs lg:max-w-md" title={product.title}>
                {product.title}
              </span>
            </span>
          </nav>
        </div>
      </div>

      {/* Product Main Section */}
      <div className="content-container py-6 sm:py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* LEFT: Image Gallery */}
          <div className="lg:col-span-7 relative">
            <ImageGalleryModern images={product?.images || []} productTitle={product.title} />
            
            {/* Badges sur l'image */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {showNewBadge && (
                <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg uppercase tracking-wider">
                  NEW
                </div>
              )}
              {isPromo && (
                <div className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg uppercase tracking-wider">
                  Promo
                </div>
              )}
              {!isInStock && (
                <div className="bg-gray-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                  Épuisé
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Product Info — Sticky */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-5">
              <ProductInfoModern product={product} region={region} />

              {/* SKU + Collection */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                {sku && (
                  <span>Réf : <span className="text-gray-600 font-medium">{sku}</span></span>
                )}
                {product.collection?.title && (
                  <LocalizedClientLink
                    href={`/collections/${product.collection.handle}`}
                    className="hover:text-amber-600 transition-colors"
                  >
                    Collection : <span className="text-gray-600 font-medium">{product.collection.title}</span>
                  </LocalizedClientLink>
                )}
              </div>
              
              <div className="border-t border-gray-100 pt-5">
                <Suspense fallback={<div className="animate-pulse h-32 bg-gray-50 rounded-xl" />}>
                  <ProductActionsModern 
                    product={product} 
                    region={region}
                    countryCode={countryCode}
                    isOutlet={isOutlet}
                  />
                </Suspense>
              </div>

              {/* Estimation de livraison */}
              {isInStock && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      Livraison estimée
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Entre le <span className="font-semibold">{formatDate(deliveryMin)}</span> et le <span className="font-semibold">{formatDate(deliveryMax)}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Stock Alert */}
              {isInStock && lowStock && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                  <svg className="w-5 h-5 flex-shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Stock limité — plus que {totalAvailable} disponible{totalAvailable > 1 ? "s" : ""}</span>
                </div>
              )}

              {/* Trust Badges - Infos livraison */}
              <div className="border-t border-gray-100 pt-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-700 shadow-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">Livraison gratuite</div>
                      <div className="text-xs text-gray-600">à partir de 75 €</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-700 shadow-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">Envoi rapide</div>
                      <div className="text-xs text-gray-600">48-72h en Belgique</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-700 shadow-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">Service après-vente</div>
                      <div className="text-xs text-gray-600">Retours 30 jours</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-700 shadow-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">6 points d'enlèvement</div>
                      <div className="text-xs text-gray-600">Livraison gratuite</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DESCRIPTION + SPECS — Accordéon style */}
      <div className="border-t border-gray-100">
        <div className="content-container py-10 lg:py-14">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Description */}
            {product.description && (
              <details open className="group bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 hover:bg-gray-50 transition-colors">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Description
                  </h2>
                  <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 prose prose-gray prose-sm max-w-none">
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              </details>
            )}

            {/* Caractéristiques */}
            {(product.material || product.weight || product.origin_country || product.type) && (
              <details open className="group bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 hover:bg-gray-50 transition-colors">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Caractéristiques
                  </h2>
                  <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6">
                  <div className="divide-y divide-gray-100">
                    {product.material && (
                      <div className="flex justify-between py-3">
                        <span className="text-sm text-gray-500">Matériau</span>
                        <span className="text-sm font-semibold text-gray-900">{product.material}</span>
                      </div>
                    )}
                    {product.weight && (
                      <div className="flex justify-between py-3">
                        <span className="text-sm text-gray-500">Poids</span>
                        <span className="text-sm font-semibold text-gray-900">{product.weight} g</span>
                      </div>
                    )}
                    {product.origin_country && (
                      <div className="flex justify-between py-3">
                        <span className="text-sm text-gray-500">Origine</span>
                        <span className="text-sm font-semibold text-gray-900">{product.origin_country}</span>
                      </div>
                    )}
                    {product.type && (
                      <div className="flex justify-between py-3">
                        <span className="text-sm text-gray-500">Type</span>
                        <span className="text-sm font-semibold text-gray-900">{product.type.value}</span>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}

            {/* Livraison & Retours */}
            <details className="group bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer px-6 py-5 hover:bg-gray-50 transition-colors">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Livraison &amp; Retours
                </h2>
                <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Livraison gratuite</p>
                      <p className="text-xs text-gray-500 mt-0.5">À partir de 75€</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Envoi rapide</p>
                      <p className="text-xs text-gray-500 mt-0.5">48-72h en Belgique</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Retours 30 jours</p>
                      <p className="text-xs text-gray-500 mt-0.5">À charge du client</p>
                    </div>
                  </div>
                </div>
              </div>
            </details>

          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="py-12 lg:py-16 bg-gray-50 border-t border-gray-100">
        <div className="content-container">
          <Suspense fallback={<SkeletonRelatedProducts />}>
            <RelatedProductsModern product={product} countryCode={countryCode} region={region} categoryId={lcEquestrianCategoryId} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default ProductTemplateModern
