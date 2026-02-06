import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import { StoreProductCategory, StoreRegion } from "@medusajs/types"
import CategoryTemplateModern from "@modules/categories/templates/category-template-modern"

type Props = {
  params: { category: string[]; countryCode: string }
  searchParams: {
    sortBy?: string
    page?: string
    q?: string
    collection?: string
    price_min?: string
    price_max?: string
    in_stock?: string
    on_sale?: string
  }
}

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  // Skip static generation if backend is not available (Railway builds)
  try {
    const product_categories = await listCategories()

    if (!product_categories) {
      return []
    }

    const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    const categoryHandles = product_categories.map(
      (category: any) => category.handle
    )

    const staticParams = countryCodes
      ?.map((countryCode: string | undefined) =>
        categoryHandles.map((handle: any) => ({
          countryCode,
          category: [handle],
        }))
      )
      .flat()

    return staticParams
  } catch (error) {
    console.log('⚠️  Backend not available during build, skipping static generation')
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { product_categories } = await getCategoryByHandle(
      params.category
    )

    const title = product_categories
      .map((category: StoreProductCategory) => category.name)
      .join(" | ")

    const description =
      product_categories[product_categories.length - 1].description ??
      `${title} category.`

    return {
      title: `${title} | Medusa Store`,
      description,
      alternates: {
        canonical: `${params.category.join("/")}`,
      },
    }
  } catch (error) {
    notFound()
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  let product_categories
  try {
    const result = await getCategoryByHandle(params.category)
    product_categories = result?.product_categories
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error)
    notFound()
  }

  if (!product_categories) {
    notFound()
  }

  return (
    <CategoryTemplateModern
      categories={product_categories}
      searchParams={searchParams}
      countryCode={params.countryCode}
    />
  )
}
