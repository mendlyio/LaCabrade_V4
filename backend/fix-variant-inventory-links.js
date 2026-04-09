/**
 * Correction des variants ayant un item inventaire "ODOO-{id}" (stock=0)
 * ET un item inventaire avec le vrai SKU (stock réel) liés simultanément.
 *
 * Cause : import initial avec SKU généré ODOO-{id}, puis ajout ultérieur
 * du vrai SKU sans retirer l'ancien lien → Medusa voit qty=0 car le
 * goulot d'étranglement est le premier item à 0.
 *
 * Usage :
 *   node fix-variant-inventory-links.js          → dry-run (lecture seule)
 *   node fix-variant-inventory-links.js --apply  → applique les corrections
 */

const { Client } = require('pg')
require('dotenv').config()

const APPLY = process.argv.includes('--apply')

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gray: '\x1b[90m',
}

function sep(title) {
  const line = '─'.repeat(Math.max(0, 70 - title.length))
  console.log(`\n${C.cyan}${C.bold}── ${title} ${line}${C.reset}`)
}
function ok(m)   { console.log(`  ${C.green}✔${C.reset} ${m}`) }
function warn(m) { console.log(`  ${C.yellow}⚠${C.reset} ${m}`) }
function info(m) { console.log(`    ${C.gray}${m}${C.reset}`) }

async function main() {
  console.log(`\n${C.bold}Fix : liens variant ↔ inventory fantômes ODOO-{id}${C.reset}`)
  console.log(`${C.gray}Mode : ${APPLY ? 'APPLY — écriture en DB' : 'DRY RUN — lecture seule'}${C.reset}`)

  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })
  await db.connect()
  console.log('✅ Connecté à la base\n')

  // ── 1. Trouver les variants liés à ≥ 2 inventory_items ──────────────────
  sep('1. Variants avec plusieurs inventory_items liés')

  const { rows: multiLinks } = await db.query(`
    SELECT
      pv.id           AS variant_id,
      pv.sku          AS variant_sku,
      p.title         AS product_title,
      array_agg(pvii.id             ORDER BY pvii.created_at) AS pvii_ids,
      array_agg(ii.id               ORDER BY pvii.created_at) AS item_ids,
      array_agg(ii.sku              ORDER BY pvii.created_at) AS item_skus,
      array_agg(pvii.created_at     ORDER BY pvii.created_at) AS pvii_dates
    FROM product_variant_inventory_item pvii
    JOIN product_variant pv ON pv.id = pvii.variant_id
    JOIN product         p  ON p.id  = pv.product_id
    JOIN inventory_item  ii ON ii.id = pvii.inventory_item_id
    GROUP BY pv.id, pv.sku, p.title
    HAVING COUNT(*) > 1
    ORDER BY p.title
  `)

  if (multiLinks.length === 0) {
    ok('Aucun variant avec plusieurs inventory_items — base propre.')
    await db.end()
    return
  }

  console.log(`  ${multiLinks.length} variant(s) avec plusieurs items liés`)

  // ── 2. Identifier les liens "fantômes" ODOO-{id} à supprimer ────────────
  sep('2. Analyse des liens fantômes')

  const toFix = []

  for (const row of multiLinks) {
    const items = row.item_ids.map((id, i) => ({
      pviiId:  row.pvii_ids[i],
      itemId:  id,
      sku:     row.item_skus[i],
      date:    row.pvii_dates[i],
    }))

    const odooItems  = items.filter(it => it.sku && it.sku.startsWith('ODOO-'))
    const realItems  = items.filter(it => it.sku && !it.sku.startsWith('ODOO-'))
    const noSkuItems = items.filter(it => !it.sku)

    if (odooItems.length === 0) {
      // Pas de lien ODOO-{id} : doublon d'un autre type, on ignore ici
      info(`SKIP (pas de ODOO-{id}) : "${row.product_title}" SKU=${row.variant_sku}`)
      continue
    }

    if (realItems.length === 0) {
      // Que des ODOO-{id} — problème différent, on ne touche pas
      warn(`Que des ODOO-{id} pour "${row.product_title}" SKU=${row.variant_sku} — ignoré`)
      continue
    }

    console.log(`\n  📦 "${row.product_title}" (variant SKU: ${row.variant_sku})`)
    realItems.forEach(it  => info(`  ✅ GARDER  pvii=${it.pviiId}  item=${it.itemId}  sku=${it.sku}`))
    odooItems.forEach(it  => info(`  🗑  RETIRER pvii=${it.pviiId}  item=${it.itemId}  sku=${it.sku}`))
    if (noSkuItems.length) noSkuItems.forEach(it => info(`  ?  SANS SKU pvii=${it.pviiId}  item=${it.itemId}`))

    toFix.push({ variantId: row.variant_id, variantSku: row.variant_sku, productTitle: row.product_title, odooItems, realItems })
  }

  // ── 3. Résumé ────────────────────────────────────────────────────────────
  sep('3. Résumé')

  if (toFix.length === 0) {
    ok('Aucune correction nécessaire.')
    await db.end()
    return
  }

  console.log(`  ${toFix.length} variant(s) à corriger`)
  console.log(`  ${toFix.reduce((n, f) => n + f.odooItems.length, 0)} lien(s) ODOO-{id} à retirer`)

  if (!APPLY) {
    console.log(`\n  ${C.yellow}${C.bold}DRY RUN — rien modifié.${C.reset}`)
    console.log(`  ${C.gray}Relancez avec --apply pour écrire en DB.${C.reset}\n`)
    await db.end()
    return
  }

  // ── 4. Application (seulement si --apply) ────────────────────────────────
  sep('4. Application des corrections')

  const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise(resolve => readline.question('\n  Confirmer la correction ? (oui/non) : ', resolve))
  readline.close()

  if (answer.toLowerCase() !== 'oui') {
    console.log('  ❌ Annulé.')
    await db.end()
    return
  }

  let fixed = 0
  let errors = 0

  for (const fix of toFix) {
    for (const phantom of fix.odooItems) {
      try {
        // 1. Récupérer les niveaux de stock de l'item fantôme
        const { rows: levels } = await db.query(
          `SELECT id, location_id, stocked_quantity, reserved_quantity FROM inventory_level WHERE inventory_item_id = $1`,
          [phantom.itemId]
        )

        // 2. Vérifier si le stock du fantôme est 0 (santé mentale avant de supprimer)
        const totalPhantomStock = levels.reduce((n, l) => n + (parseFloat(l.stocked_quantity) || 0), 0)
        if (totalPhantomStock > 0) {
          warn(`Stock non nul (${totalPhantomStock}) sur item fantôme ${phantom.itemId} (${phantom.sku}) — transfert vers item réel avant suppression`)

          // Transférer le stock vers le premier item réel
          const realItem = fix.realItems[0]
          for (const level of levels) {
            const { rows: existingLevels } = await db.query(
              `SELECT id, stocked_quantity, reserved_quantity FROM inventory_level WHERE inventory_item_id = $1 AND location_id = $2`,
              [realItem.itemId, level.location_id]
            )
            if (existingLevels.length > 0) {
              await db.query(
                `UPDATE inventory_level SET stocked_quantity = stocked_quantity + $1, reserved_quantity = reserved_quantity + $2, updated_at = NOW() WHERE id = $3`,
                [level.stocked_quantity, level.reserved_quantity, existingLevels[0].id]
              )
              info(`Stock ${totalPhantomStock} transféré vers item ${realItem.sku}`)
            }
          }
        }

        // 3. Supprimer le lien variant ↔ inventory fantôme
        await db.query(`DELETE FROM product_variant_inventory_item WHERE id = $1`, [phantom.pviiId])

        // 4. Supprimer les niveaux de stock du fantôme
        if (levels.length > 0) {
          await db.query(`DELETE FROM inventory_level WHERE inventory_item_id = $1`, [phantom.itemId])
        }

        // 5. Supprimer l'inventory item fantôme (s'il n'est plus lié à aucun autre variant)
        const { rows: stillLinked } = await db.query(
          `SELECT id FROM product_variant_inventory_item WHERE inventory_item_id = $1 LIMIT 1`,
          [phantom.itemId]
        )
        if (stillLinked.length === 0) {
          await db.query(`DELETE FROM inventory_item WHERE id = $1`, [phantom.itemId])
          info(`Item fantôme supprimé : ${phantom.itemId} (${phantom.sku})`)
        } else {
          info(`Item fantôme encore lié à d'autres variants — conservé : ${phantom.itemId}`)
        }

        ok(`"${fix.productTitle}" SKU=${fix.variantSku} : lien ${phantom.sku} retiré`)
        fixed++
      } catch (err) {
        console.error(`  ${C.red}❌ Erreur sur ${phantom.itemId}:${C.reset}`, err.message)
        errors++
      }
    }
  }

  sep('Terminé')
  ok(`${fixed} lien(s) corrigé(s)`)
  if (errors > 0) warn(`${errors} erreur(s) — vérifiez les logs ci-dessus`)
  console.log(`\n  ${C.gray}Redémarre le backend Railway pour que le cache Medusa se rafraîchisse.${C.reset}\n`)

  await db.end()
}

main().catch(e => {
  console.error(`\n❌ Erreur fatale :`, e.message)
  process.exit(1)
})
