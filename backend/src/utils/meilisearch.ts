import { MeiliSearch, Index } from "meilisearch"

export const PRODUCT_INDEX = "products"

/**
 * Synonymes équestres (bidirectionnels) pour la recherche Meilisearch.
 * Permet de retrouver un produit même si le client emploie un autre mot.
 */
export const MEILI_SYNONYMS: Record<string, string[]> = {
  bombe: ["casque"],
  casque: ["bombe"],
  tapis: ["pad", "chabraque"],
  pad: ["tapis"],
  chabraque: ["tapis"],
  filet: ["bridon", "bride"],
  bridon: ["filet", "bride"],
  bride: ["filet", "bridon"],
  licol: ["licou"],
  licou: ["licol"],
  couverture: ["chemise"],
  chemise: ["couverture"],
  culotte: ["pantalon"],
  pantalon: ["culotte"],
  guetre: ["guetres", "protection"],
  etriviere: ["etrivieres"],
  etrier: ["etriers"],
  basket: ["baskets", "chaussure", "chaussures"],
  chaussure: ["chaussures", "basket"],
}

let cachedClient: MeiliSearch | null | undefined

/** Nettoie une valeur d'env : retire espaces et guillemets entourants éventuels. */
function cleanEnv(v?: string): string {
  return (v || "").trim().replace(/^['"]+/, "").replace(/['"]+$/, "").trim()
}

/** Retourne le client Meilisearch, ou null si non configuré. */
export function getMeiliClient(): MeiliSearch | null {
  if (cachedClient !== undefined) return cachedClient
  const host = cleanEnv(process.env.MEILISEARCH_HOST)
  const apiKey = cleanEnv(process.env.MEILISEARCH_API_KEY)
  if (!host || !apiKey) {
    cachedClient = null
    return null
  }
  try {
    cachedClient = new MeiliSearch({ host, apiKey })
  } catch {
    cachedClient = null
  }
  return cachedClient
}

export function getProductIndex(): Index | null {
  const client = getMeiliClient()
  return client ? client.index(PRODUCT_INDEX) : null
}

/** Paramètres de l'index produits (à appliquer à la (ré)indexation). */
export function getIndexSettings() {
  return {
    searchableAttributes: [
      "title",
      "brand",
      "collection",
      "categories",
      "sku",
      "description",
    ],
    filterableAttributes: ["category_handles", "collection_handle", "brand"],
    sortableAttributes: ["price"],
    synonyms: MEILI_SYNONYMS,
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    },
    rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
  }
}

export type ProductSearchDoc = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  brand: string | null
  collection: string | null
  collection_handle: string | null
  categories: string[]
  category_handles: string[]
  sku: string[]
  description: string
  price: number | null
  currency: string
}

function stripHtml(str: string): string {
  return (str || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500)
}

/**
 * Convertit un produit Medusa en document Meilisearch.
 * `price` (euros TTC) est calculé séparément par l'appelant (réindexation/sync).
 */
export function productToSearchDoc(product: any, price: number | null): ProductSearchDoc {
  const brand = (product?.metadata?.brand as string) || product?.collection?.title || null
  const categories = (product?.categories || [])
    .map((c: any) => c?.name)
    .filter(Boolean)
  const categoryHandles = (product?.categories || [])
    .map((c: any) => c?.handle)
    .filter(Boolean)
  const sku = (product?.variants || [])
    .map((v: any) => v?.sku)
    .filter(Boolean)
  const thumbnail =
    product?.thumbnail ||
    product?.images?.[0]?.url ||
    (typeof product?.images?.[0] === "string" ? product.images[0] : null) ||
    null

  return {
    id: product.id,
    title: product.title || "",
    handle: product.handle || "",
    thumbnail,
    brand,
    collection: product?.collection?.title || null,
    collection_handle: product?.collection?.handle || null,
    categories,
    category_handles: categoryHandles,
    sku,
    description: stripHtml(product?.description || ""),
    price,
    currency: "eur",
  }
}
