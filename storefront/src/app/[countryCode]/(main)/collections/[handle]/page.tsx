import { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  getCollectionByHandle,
  getCollectionsList,
} from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplateModern from "@modules/collections/templates/collection-template-modern"

type Props = {
  params: { handle: string; countryCode: string }
  searchParams: {
    sortBy?: string
    page?: string
    q?: string
    category?: string
    price_min?: string
    price_max?: string
    in_stock?: string
    on_sale?: string
  }
}

export const PRODUCT_LIMIT = 12

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  // Skip static generation if backend is not available (Railway builds)
  try {
    const { collections } = await getCollectionsList()

    if (!collections) {
      return []
    }

    const countryCodes = await listRegions().then(
      (regions: StoreRegion[]) =>
        regions
          ?.map((r) => r.countries?.map((c) => c.iso_2))
          .flat()
          .filter(Boolean) as string[]
    )

    const collectionHandles = collections.map(
      (collection: StoreCollection) => collection.handle
    )

    const staticParams = countryCodes
      ?.map((countryCode: string) =>
        collectionHandles.map((handle: string | undefined) => ({
          countryCode,
          handle,
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
  const collection = await getCollectionByHandle(params.handle)

  if (!collection) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"
  const description = `Découvrez la collection ${collection.title} sur La Cabrade, sellerie équestre de qualité.`

  return {
    title: `${collection.title} | La Cabrade`,
    description,
    openGraph: {
      type: "website",
      title: `${collection.title} | La Cabrade`,
      description,
      url: `${baseUrl}/${params.countryCode}/collections/${params.handle}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${collection.title} | La Cabrade`,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/${params.countryCode}/collections/${params.handle}`,
    },
  }
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const collection = await getCollectionByHandle(params.handle).then(
    (collection: StoreCollection) => collection
  )

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplateModern
      collection={collection}
      searchParams={searchParams}
      countryCode={params.countryCode}
    />
  )
}
