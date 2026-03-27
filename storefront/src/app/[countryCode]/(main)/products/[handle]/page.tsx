import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import ProductTemplateModern from "@modules/products/templates/product-template-modern"
import { getRegion, listRegions } from "@lib/data/regions"
import { getProductByHandle, getProductsList, GIFT_CARD_PRODUCT_HANDLE } from "@lib/data/products"

type Props = {
  params: { countryCode: string; handle: string }
}

// ISR : cache HTML/RSC et régénère au plus toutes les 300 s (moins de TTFB qu’un SSR à chaque hit).
// Prix / stock catalogue peuvent être légèrement en retard vs Medusa ; le panier reste temps réel côté client.
export const revalidate = 300

export async function generateStaticParams() {
  // Skip static generation if backend is not available (Railway builds)
  try {
    const countryCodes = await listRegions().then(
      (regions) =>
        regions
          ?.map((r) => r.countries?.map((c) => c.iso_2))
          .flat()
          .filter(Boolean) as string[]
    )

    if (!countryCodes) {
      return []
    }

    const products = await Promise.all(
      countryCodes.map((countryCode) => {
        return getProductsList({ countryCode })
      })
    ).then((responses) =>
      responses.map(({ response }) => response.products).flat()
    )

    const staticParams = countryCodes
      ?.map((countryCode) =>
        products
          .filter((p) => p.handle !== GIFT_CARD_PRODUCT_HANDLE)
          .map((product) => ({
            countryCode,
            handle: product.handle,
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
  const { handle, countryCode } = params
  if (handle === GIFT_CARD_PRODUCT_HANDLE) {
    return { title: { absolute: "Bon Cadeau | La Cabrade" } }
  }
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  const product = await getProductByHandle(handle, region.id)

  if (!product) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"
  return {
    title: { absolute: `${product.title} | La Cabrade` },
    description: product.description || `Découvrez ${product.title} sur La Cabrade - Sellerie équestre de qualité`,
    openGraph: {
      type: "website",
      title: `${product.title} | La Cabrade`,
      description: product.description || `Découvrez ${product.title} sur La Cabrade`,
      images: product.thumbnail ? [{ url: product.thumbnail }] : [],
      url: `${baseUrl}/${countryCode}/products/${handle}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | La Cabrade`,
      description: product.description || `Découvrez ${product.title} sur La Cabrade`,
    },
    alternates: {
      canonical: `${baseUrl}/${countryCode}/products/${handle}`,
    },
  }
}

export default async function ProductPage({ params }: Props) {
  if (params.handle === GIFT_CARD_PRODUCT_HANDLE) {
    redirect(`/${params.countryCode}/bon-cadeau`)
  }

  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const pricedProduct = await getProductByHandle(params.handle, region.id)
  if (!pricedProduct) {
    notFound()
  }

  return (
    <ProductTemplateModern
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
    />
  )
}
