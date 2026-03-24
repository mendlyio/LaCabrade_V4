/**
 * Corrige directement en base le unit_price du bon cadeau GC-050
 * dans la commande #27 (ordli_01KMA9ETV6KEGHCFTG6MQ32R1D).
 *
 * Medusa v2 utilise raw_unit_price (JSONB) comme source de vérité.
 * Il faut mettre à jour les deux colonnes.
 *
 * Usage : npx medusa exec src/scripts/fix-order27-sql.ts
 */

import { ExecArgs } from "@medusajs/framework/types"

const LINE_ITEM_ID = "ordli_01KMA9ETV6KEGHCFTG6MQ32R1D"
const CORRECT_PRICE = 50

export default async function fixOrder27Sql({ container }: ExecArgs) {
  const logger = container.resolve("logger") as any
  const pgConnection = container.resolve("__pg_connection__") as any

  logger.info(`🔧 Correction directe SQL du line item ${LINE_ITEM_ID}...`)

  try {
    // Vérifier la valeur actuelle
    const before = await pgConnection.raw(
      `SELECT id, unit_price, raw_unit_price FROM order_line_item WHERE id = ?`,
      [LINE_ITEM_ID]
    )
    const row = before.rows?.[0] || before[0]?.[0]
    logger.info(`Avant: unit_price=${row?.unit_price}, raw_unit_price=${JSON.stringify(row?.raw_unit_price)}`)

    // Mettre à jour unit_price et raw_unit_price
    await pgConnection.raw(
      `UPDATE order_line_item
       SET unit_price = ?,
           raw_unit_price = ?::jsonb,
           updated_at = NOW()
       WHERE id = ?`,
      [
        CORRECT_PRICE,
        JSON.stringify({ value: String(CORRECT_PRICE), precision: 20 }),
        LINE_ITEM_ID,
      ]
    )

    // Vérifier après
    const after = await pgConnection.raw(
      `SELECT id, unit_price, raw_unit_price FROM order_line_item WHERE id = ?`,
      [LINE_ITEM_ID]
    )
    const rowAfter = after.rows?.[0] || after[0]?.[0]
    logger.info(`Après: unit_price=${rowAfter?.unit_price}, raw_unit_price=${JSON.stringify(rowAfter?.raw_unit_price)}`)

    logger.info(`✅ Corrigé : unit_price = ${CORRECT_PRICE}€`)
  } catch (e: any) {
    logger.error(`❌ Erreur SQL: ${e.message}`)

    // Fallback : essayer via knex manager
    try {
      logger.info("Tentative via manager...")
      const manager = container.resolve("manager") as any
      await manager.query(
        `UPDATE order_line_item
         SET unit_price = $1,
             raw_unit_price = $2::jsonb,
             updated_at = NOW()
         WHERE id = $3`,
        [
          CORRECT_PRICE,
          JSON.stringify({ value: String(CORRECT_PRICE), precision: 20 }),
          LINE_ITEM_ID,
        ]
      )
      logger.info(`✅ Corrigé via manager`)
    } catch (e2: any) {
      logger.error(`❌ Erreur manager: ${e2.message}`)
    }
  }
}
