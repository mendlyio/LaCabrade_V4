import { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { listCategories } from "@lib/data/categories"
import { getBrandBySlug, listBrands } from "@lib/data/brands"
import FiltersModern from "@modules/store/components/filters-modern"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PaginatedProductsModern from "@modules/store/templates/store-template-modern/paginated-products-modern"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Props = {
  params: { countryCode: string; handle: string }
  searchParams: {
    sortBy?: string
    page?: string
    q?: string
    category?: string
    brand?: string
    price_min?: string
    price_max?: string
    in_stock?: string
    on_sale?: string
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const brand = await getBrandBySlug(params.handle)

    if (!brand) {
      return {
        title: "Marque introuvable",
        description: "La marque demandée est introuvable.",
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"
    const description = `Découvrez les ${brand.count} produits de la marque ${brand.name} sur La Cabrade, sellerie équestre de qualité.`

    return {
      title: `${brand.name} | Marques | La Cabrade`,
      description,
      openGraph: {
        type: "website",
        title: `${brand.name} | La Cabrade`,
        description,
        url: `${baseUrl}/${params.countryCode}/marques/${params.handle}`,
      },
      twitter: {
        card: "summary_large_image",
        title: `${brand.name} | La Cabrade`,
        description,
      },
      alternates: {
        canonical: `${baseUrl}/${params.countryCode}/marques/${params.handle}`,
      },
    }
  } catch {
    return {
      title: "Marque | La Cabrade",
      description: "Découvrez nos marques équestres sur La Cabrade.",
    }
  }
}

export const dynamic = "force-dynamic"

export default async function BrandPage({ params, searchParams }: Props) {
  const [brand, allCategories, brands] = await Promise.all([
    getBrandBySlug(params.handle),
    listCategories().catch((error) => {
      console.error("Erreur lors du chargement des catégories:", error)
      return [] as any[]
    }),
    listBrands().catch((error) => {
      console.error("Erreur lors du chargement des marques:", error)
      return [] as any[]
    }),
  ])

  if (!brand) {
    notFound()
  }

  const searchParamsWithBrand = {
    ...searchParams,
    brand: brand.slug,
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="bg-[#9e354a] text-white py-12 mb-8">
        <div className="content-container">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm text-amber-100 mb-4">
              <LocalizedClientLink href="/store" className="hover:text-white transition-colors">
                Boutique
              </LocalizedClientLink>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <LocalizedClientLink href="/marques" className="hover:text-white transition-colors">
                Marques
              </LocalizedClientLink>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {brand.name}
            </h1>

            <p className="text-lg text-amber-50">
              {brand.count} produit{brand.count > 1 ? "s" : ""} disponible{brand.count > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="content-container pb-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters (desktop: aside fixe / mobile: bouton + overlay) */}
          <aside className="lg:w-80 lg:flex-shrink-0">
            <FiltersModern categories={allCategories || []} brands={brands || []} />
          </aside>

          <main className="flex-1 min-w-0">
            <Suspense fallback={<SkeletonProductGrid />}>
              <PaginatedProductsModern
                searchParams={searchParamsWithBrand}
                countryCode={params.countryCode}
              />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
