import type { Pool } from "pg"

/**
 * Réactive les enregistrements `price`, `price_set` et `product_variant_price_set`
 * encore présents mais soft-deleted pour un produit donné (prix EUR).
 *
 * À utiliser après `upsertVariantPricesWorkflow` : Medusa invalide souvent l’ancienne
 * chaîne avant d’en créer une nouvelle ; en cas d’échec partiel, les lignes restent
 * avec `deleted_at` et l’API n’expose aucun prix.
 */
export async function restoreSoftDeletedPricingForProduct(
  pool: Pool,
  productId: string
): Promise<void> {
  await pool.query(
    `UPDATE price pp
     SET deleted_at = NULL, updated_at = NOW()
     FROM product_variant pv
     JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
     WHERE pp.price_set_id = pvps.price_set_id
       AND pv.product_id = $1
       AND pv.deleted_at IS NULL
       AND pp.deleted_at IS NOT NULL
       AND LOWER(pp.currency_code) = 'eur'`,
    [productId]
  )

  await pool.query(
    `UPDATE price_set ps
     SET deleted_at = NULL, updated_at = NOW()
     WHERE ps.id IN (
       SELECT pvps.price_set_id
       FROM product_variant pv
       JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
       WHERE pv.product_id = $1 AND pv.deleted_at IS NULL
     )
     AND ps.deleted_at IS NOT NULL`,
    [productId]
  )

  await pool.query(
    `UPDATE product_variant_price_set pvps
     SET deleted_at = NULL, updated_at = NOW()
     FROM product_variant pv
     WHERE pvps.variant_id = pv.id
       AND pv.product_id = $1
       AND pv.deleted_at IS NULL
       AND pvps.deleted_at IS NOT NULL`,
    [productId]
  )
}
