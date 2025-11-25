import React, { Suspense } from "react"
import { HttpTypes } from "@medusajs/types"
import { notFound } from "next/navigation"
import ImageGalleryModern from "@modules/products/components/image-gallery-modern"
import ProductInfoModern from "@modules/products/components/product-info-modern"
import ProductActionsModern from "@modules/products/components/product-actions-modern"
import ProductShareButtons from "@modules/products/components/product-share-buttons"
import ProductTrustBadges from "@modules/products/components/product-trust-badges"
import RelatedProductsModern from "@modules/products/components/related-products-modern"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductTemplateModernProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
}

const ProductTemplateModern: React.FC<ProductTemplateModernProps> = ({
  product,
  region,
  countryCode,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  // Vérifier si le produit est en promotion
  const hasDiscount = product.variants?.some(v => 
    v.calculated_price && v.calculated_price.calculated_amount < v.calculated_price.original_amount
  )

  // Vérifier le stock
  const isInStock = product.variants?.some(v => (v.inventory_quantity || 0) > 0)
  const lowStock = product.variants?.some(v => v.inventory_quantity && v.inventory_quantity < 5)

  // Vérifier les metadata pour les pastilles NEW et PROMO
  const isNew = product.metadata?.is_new === true || product.metadata?.is_new === "true"
  const newUntil = product.metadata?.new_until ? new Date(product.metadata.new_until as string).getTime() : null
  const showNewBadge = isNew && (!newUntil || Date.now() < newUntil)
  const isPromo = product.metadata?.is_promo === true || product.metadata?.is_promo === "true"

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="content-container py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <LocalizedClientLink href="/" className="hover:text-amber-600 transition-colors">
              Accueil
            </LocalizedClientLink>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <LocalizedClientLink href="/store" className="hover:text-amber-600 transition-colors">
              Boutique
            </LocalizedClientLink>
            {product.collection && (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <LocalizedClientLink 
                  href={`/collections/${product.collection.handle}`}
                  className="hover:text-amber-600 transition-colors"
                >
                  {product.collection.title}
                </LocalizedClientLink>
              </>
            )}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-gray-900">{product.title}</span>
          </nav>
        </div>
      </div>

      {/* Product Main Section */}
      <div className="content-container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* LEFT: Image Gallery (60% on desktop) */}
          <div className="lg:col-span-7 relative order-1 lg:order-1">
            <ImageGalleryModern images={product?.images || []} />
            
            {/* Badges sur l'image */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
              {showNewBadge && (
                <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg uppercase tracking-wide">
                  New
                </div>
              )}
              {isPromo && (
                <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg uppercase tracking-wide animate-pulse">
                  Promo
                </div>
              )}
              {!isInStock && (
                <div className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  Rupture de stock
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Product Info (40% on desktop) */}
          <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-2">
            <ProductInfoModern product={product} region={region} />
            
            <div className="border-t border-gray-200 pt-6">
              <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded-lg" />}>
                <ProductActionsModern 
                  product={product} 
                  region={region}
                  countryCode={countryCode}
                />
              </Suspense>
            </div>

            {/* Stock Alert */}
            {isInStock && lowStock && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Stock limité ! Plus que quelques articles disponibles.</span>
              </div>
            )}

            {/* Share Buttons */}
            <div className="border-t border-gray-200 pt-6">
              <ProductShareButtons product={product} />
            </div>

            {/* Trust Badges */}
            <div className="border-t border-gray-200 pt-6">
              <ProductTrustBadges />
            </div>
          </div>
        </div>
      </div>

      {/* DESCRIPTION - Bloc dédié */}
      <div className="bg-white py-12 border-t border-gray-200">
        <div className="content-container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
              Description du produit
            </h2>
            <div className="prose prose-gray prose-lg max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-center md:text-left">
                {product.description || "Aucune description disponible pour ce produit."}
              </p>
            </div>

            {/* Product Specifications */}
            {(product.material || product.weight || product.origin_country || product.type) && (
              <div className="mt-10 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 md:p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 justify-center md:justify-start">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Caractéristiques techniques
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {product.material && (
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="text-sm text-gray-500 mb-1 font-medium">Matériau</div>
                      <div className="font-bold text-gray-900">{product.material}</div>
                    </div>
                  )}
                  {product.weight && (
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="text-sm text-gray-500 mb-1 font-medium">Poids</div>
                      <div className="font-bold text-gray-900">{product.weight} g</div>
                    </div>
                  )}
                  {product.origin_country && (
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="text-sm text-gray-500 mb-1 font-medium">Origine</div>
                      <div className="font-bold text-gray-900">{product.origin_country}</div>
                    </div>
                  )}
                  {product.type && (
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="text-sm text-gray-500 mb-1 font-medium">Type</div>
                      <div className="font-bold text-gray-900">{product.type.value}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shipping & Returns Info - Bloc séparé */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-12 border-t border-gray-200">
        <div className="content-container">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Livraison & Retours
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-shrink-0 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="font-bold text-gray-900 text-lg mb-2">Livraison gratuite</div>
                <div className="text-sm text-gray-600">Dès 100€ d'achat en Belgique</div>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-shrink-0 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="font-bold text-gray-900 text-lg mb-2">Livraison rapide</div>
                <div className="text-sm text-gray-600">48-72h en Belgique</div>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex-shrink-0 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
                <div className="font-bold text-gray-900 text-lg mb-2">Retours gratuits</div>
                <div className="text-sm text-gray-600">30 jours pour changer d'avis</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="content-container">
          <Suspense fallback={<SkeletonRelatedProducts />}>
            <RelatedProductsModern product={product} countryCode={countryCode} region={region} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default ProductTemplateModern

