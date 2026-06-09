import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  getProductIndex,
  getIndexSettings,
  productToSearchDoc,
} from "./meilisearch"

const PRODUCT_RELATIONS = ["variants", "images", "collection", "categories"]

/** Prix EUR le plus récent par variante (source de vérité: pricing module). */
async function getPriceMap(knex: any, variantIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!variantIds.length) return map
  const { rows } = await knex.raw(
    `
    SELECT pv.id AS variant_id, pp.amount AS amount
    FROM product_variant pv
    LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
    LEFT JOIN price_set ps ON ps.id = pvps.price_set_id
    LEFT JOIN price pp ON pp.price_set_id = ps.id
    WHERE pv.id IN (?)
      AND pp.currency_code = 'eur'
      AND pp.amount IS NOT NULL
      AND pp.deleted_at IS NULL
    ORDER BY pv.id, pp.created_at DESC
  `,
    [variantIds]
  )
  for (const r of rows) {
    if (!map.has(r.variant_id)) map.set(r.variant_id, Number(r.amount))
  }
  return map
}

function minProductPrice(product: any, priceMap: Map<string, number>): number | null {
  const prices = (product.variants || [])
    .map((v: any) => priceMap.get(v.id))
    .filter((p: any) => typeof p === "number" && p > 0)
  return prices.length ? Math.min(...prices) : null
}

/** Applique les paramètres de l'index (synonymes, fautes, attributs). */
export async function ensureProductIndexSettings(): Promise<boolean> {
  const index = getProductIndex()
  if (!index) return false
  await index.updateSettings(getIndexSettings() as any)
  return true
}

/** Réindexe tous les produits publiés. */
export async function reindexAllProducts(
  container: any,
  opts?: { fresh?: boolean }
): Promise<{ indexed: number; available: boolean }> {
  const index = getProductIndex()
  if (!index) return { indexed: 0, available: false }

  const productService: any = container.resolve(Modules.PRODUCT)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  await index.updateSettings(getIndexSettings() as any)
  if (opts?.fresh) {
    try {
      await index.deleteAllDocuments()
    } catch {
      /* noop */
    }
  }

  let offset = 0
  const take = 200
  let total = 0
  while (true) {
    const products = await productService.listProducts(
      { status: "published" },
      { relations: PRODUCT_RELATIONS, take, skip: offset }
    )
    if (!products?.length) break

    const variantIds = products.flatMap((p: any) => (p.variants || []).map((v: any) => v.id))
    const priceMap = await getPriceMap(knex, variantIds)
    const docs = products.map((p: any) => productToSearchDoc(p, minProductPrice(p, priceMap)))
    await index.addDocuments(docs, { primaryKey: "id" })

    total += docs.length
    if (products.length < take) break
    offset += take
  }

  return { indexed: total, available: true }
}

/** Synchronise un produit (upsert si publié, suppression sinon). */
export async function syncProductToIndex(container: any, productId: string): Promise<void> {
  const index = getProductIndex()
  if (!index || !productId) return

  const productService: any = container.resolve(Modules.PRODUCT)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  let product: any
  try {
    product = await productService.retrieveProduct(productId, { relations: PRODUCT_RELATIONS })
  } catch {
    return
  }
  if (!product || product.status !== "published") {
    try {
      await index.deleteDocument(productId)
    } catch {
      /* noop */
    }
    return
  }

  const variantIds = (product.variants || []).map((v: any) => v.id)
  const priceMap = await getPriceMap(knex, variantIds)
  await index.addDocuments([productToSearchDoc(product, minProductPrice(product, priceMap))], {
    primaryKey: "id",
  })
}

export async function removeProductFromIndex(productId: string): Promise<void> {
  const index = getProductIndex()
  if (!index || !productId) return
  try {
    await index.deleteDocument(productId)
  } catch {
    /* noop */
  }
}
