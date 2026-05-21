import type { Pool } from "pg"

/**
 * Crée les `price_set` + `price` manquants pour les variantes d'un produit.
 *
 * Cas d'usage : après `upsertVariantPricesWorkflow`, certaines variantes
 * peuvent rester sans price_set (typiquement : nouvelles variantes ajoutées
 * dans Odoo à un produit existant — l'update workflow Medusa les crée mais
 * la création du price_set échoue silencieusement dans certains cas).
 *
 * Cette fonction :
 *   1. Trouve les variantes du produit dont SKU ∈ `variantPricesBySku.keys()`
 *      et qui n'ont aucun price_set lié.
 *   2. Insère pour elles un price_set + product_variant_price_set + price.
 *
 * Idempotent : ne fait rien si tous les price_sets existent déjà.
 */
export async function ensurePriceSetsForProduct(
  pool: Pool,
  productId: string,
  variantPricesBySku: Map<string, { amount: number; currency: string }>
): Promise<number> {
  if (variantPricesBySku.size === 0) return 0

  const { rows: missing } = await pool.query<{ variant_id: string; sku: string }>(
    `SELECT pv.id AS variant_id, pv.sku
     FROM product_variant pv
     LEFT JOIN product_variant_price_set pvps
       ON pvps.variant_id = pv.id AND pvps.deleted_at IS NULL
     WHERE pv.product_id = $1
       AND pv.deleted_at IS NULL
       AND pv.sku = ANY($2::text[])
       AND pvps.id IS NULL`,
    [productId, Array.from(variantPricesBySku.keys())]
  )

  if (missing.length === 0) return 0

  let created = 0
  for (const v of missing) {
    const price = variantPricesBySku.get(v.sku)
    if (!price || !Number.isFinite(price.amount) || price.amount <= 0) continue

    const priceSetId = `pset_${randomId()}`
    const pvpsId = `pvps_${randomId()}`
    const priceId = `price_${randomId()}`

    try {
      await pool.query("BEGIN")
      await pool.query(
        `INSERT INTO price_set (id, created_at, updated_at) VALUES ($1, NOW(), NOW())`,
        [priceSetId]
      )
      await pool.query(
        `INSERT INTO product_variant_price_set (id, variant_id, price_set_id, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [pvpsId, v.variant_id, priceSetId]
      )
      await pool.query(
        `INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, rules_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, 0, NOW(), NOW())`,
        [
          priceId,
          priceSetId,
          price.currency.toLowerCase(),
          price.amount,
          JSON.stringify({ value: String(price.amount), precision: 20 }),
        ]
      )
      await pool.query("COMMIT")
      created++
    } catch (e: any) {
      await pool.query("ROLLBACK").catch(() => {})
      console.error(
        `[ensurePriceSetsForProduct] SKU ${v.sku} (product ${productId}): ${e?.message || e}`
      )
    }
  }

  if (created > 0) {
    console.log(
      `🩹 [PRICE FIX] Produit ${productId}: ${created} price_set(s) manquant(s) créé(s) après upsert`
    )
  }
  return created
}

function randomId(): string {
  const chars = "0123456789abcdefghjkmnpqrstvwxyz"
  let s = ""
  for (let i = 0; i < 26; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}
