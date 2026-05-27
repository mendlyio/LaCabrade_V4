import { Metadata } from "next"
import StoreTemplateModern from "@modules/store/templates/store-template-modern"

const STORE_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"

export const metadata: Metadata = {
  title: "Sellerie en ligne Belgique — 4 000+ Articles Cavalier & Cheval | La Cabrade Liège",
  description: "Sellerie en ligne Belgique : plus de 4 000 articles équestres. Selles, briderie, casques, bottes, vêtements cavalier, soins cheval. Livraison rapide. Sellerie La Cabrade — Liège.",
  openGraph: {
    type: "website",
    title: "Sellerie en ligne Belgique — 4 000+ Articles | La Cabrade Liège",
    description: "Plus de 4 000 articles équestres : selles, briderie, casques, bottes, vêtements cavalier et soins cheval. Livraison rapide en Belgique et France.",
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
