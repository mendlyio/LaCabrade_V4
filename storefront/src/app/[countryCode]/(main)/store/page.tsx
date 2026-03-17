import { Metadata } from "next"
import StoreTemplateModern from "@modules/store/templates/store-template-modern"

const STORE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"

export const metadata: Metadata = {
  title: "Boutique - La Cabrade",
  description: "Découvrez notre gamme complète de produits équestres de qualité. Selles, briderie, équipement cavalier et cheval. Livraison rapide en Belgique.",
  openGraph: {
    type: "website",
    title: "Boutique - La Cabrade",
    description: "Découvrez notre gamme complète de produits équestres de qualité.",
  },
  alternates: {
    canonical: `${STORE_BASE_URL}/be/store`,
  },
}

type Params = {
  searchParams: {
    sortBy?: string
    page?: string
    q?: string
    category?: string
    collection?: string
    price_min?: string
    price_max?: string
    in_stock?: string
    on_sale?: string
  }
  params: {
    countryCode: string
  }
}

export default async function StorePage({ searchParams, params }: Params) {
  return (
    <StoreTemplateModern
      searchParams={searchParams}
      countryCode={params.countryCode}
    />
  )
}
