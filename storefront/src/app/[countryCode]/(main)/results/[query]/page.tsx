import { Metadata } from "next"
import SearchResultsTemplate from "@modules/search/templates/search-results-template"
import { searchProductIds } from "@modules/search/actions"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type Params = {
  params: { query: string; countryCode: string }
  searchParams: {
    sortBy?: SortOptions
    page?: string
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const q = decodeURIComponent(params.query)
  return {
    title: `Recherche : ${q}`,
    description: `Résultats de recherche pour "${q}" sur La Cabrade.`,
  }
}

export default async function SearchResults({ params, searchParams }: Params) {
  const { query, countryCode } = params
  const { sortBy, page } = searchParams

  const ids = await searchProductIds(decodeURIComponent(query), countryCode)

  return (
    <SearchResultsTemplate
      query={query}
      ids={ids}
      sortBy={sortBy}
      page={page}
      countryCode={countryCode}
    />
  )
}
