import { Metadata } from "next"
import StoreTemplateModern from "@modules/store/templates/store-template-modern"

export const metadata: Metadata = {
  title: "Boutique - La Cabrade",
  description: "Découvrez notre gamme complète de produits équestres de qualité.",
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
