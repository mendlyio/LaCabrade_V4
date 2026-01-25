import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import RelatedProducts from "@modules/products/components/related-products"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import ProductActionsWrapper from "./product-actions-wrapper"
import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { slugify } from "@lib/util/slugify"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  const { cheapestPrice } = getProductPrice({ product })

  return (
    <>
      {/* Section principale : Galerie GAUCHE + Infos DROITE */}
      <div className="content-container py-8" data-testid="product-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* GAUCHE : Galerie d'images avec miniatures verticales */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ImageGallery images={product?.images || []} productId={product.id} />
          </div>

          {/* DROITE : Informations et actions produit */}
          <div className="space-y-6">
            {/* Marque (Odoo -> metadata.brand) ou fallback collection */}
            {(product.metadata?.brand || product.collection?.title) && (
              <LocalizedClientLink
                href={`/marques/${slugify((product.metadata?.brand as string) || product.collection?.title || "")}`}
                className="text-sm font-medium text-gray-500 uppercase tracking-wide hover:text-amber-600 transition-colors"
              >
                {(product.metadata?.brand as string) || product.collection?.title}
              </LocalizedClientLink>
            )}

            {/* Titre du produit */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {product.title}
            </h1>

            {/* Prix */}
            <div className="border-t border-b border-gray-200 py-6">
              <div className="text-4xl font-bold text-amber-600">
                {cheapestPrice?.calculated_price || "Prix sur demande"}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                TVA incluse • Livraison calculée à la caisse
              </div>
            </div>

            {/* Actions produit (variantes, stock, bouton panier) */}
            <Suspense
              fallback={
                <ProductActions
                  disabled={true}
                  product={product}
                  region={region}
                />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>
          </div>
        </div>
        
        {/* Description complète - Full width */}
        {product.description && (
          <div className="mt-16 max-w-3xl mx-auto text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">Description</h2>
            <div className="prose prose-lg prose-amber text-gray-700 whitespace-pre-line leading-relaxed mx-auto">
              {product.description}
            </div>
          </div>
        )}
      </div>

      {/* Bannière infos livraison */}
      <div className="bg-amber-600 border-y border-amber-200">
        <div className="content-container py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <div className="font-semibold text-gray-900">Livraison gratuite</div>
              <div className="text-sm text-gray-600">Dès 100€ d'achat</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div className="font-semibold text-gray-900">Paiement sécurisé</div>
              <div className="text-sm text-gray-600">100% sécurisé</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div className="font-semibold text-gray-900">Retours gratuits</div>
              <div className="text-sm text-gray-600">Sous 30 jours</div>
            </div>
          </div>
        </div>
      </div>

      {/* Produits similaires */}
      <div className="content-container my-16" data-testid="related-products-container">
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
