#!/usr/bin/env tsx
/**
 * Audit + correction de stock : aligne Medusa sur Odoo (source de vérité)
 * 
 * Logique : stocked = odooQty + reserved  →  available = odooQty
 * 
 * Usage :
 *   npx tsx src/scripts/sync-stock-audit-fix.ts          # dry-run (lecture seule)
 *   npx tsx src/scripts/sync-stock-audit-fix.ts --apply  # applique les corrections
 */
import { loadEnv } from "@medusajs/framework/utils"
loadEnv(process.env.NODE_ENV || "development", process.cwd())
import OdooModuleService from "../modules/odoo/service"
import pg from "pg"

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m",
  green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", gray: "\x1b[90m", blue: "\x1b[34m",
}
const apply = process.argv.includes("--apply")
const log  = (m: string) => console.log(m)
const ok   = (m: string) => log(`  ${C.green}✔${C.reset} ${m}`)
const warn = (m: string) => log(`  ${C.yellow}⚠${C.reset} ${m}`)
const fix  = (m: string) => log(`  ${C.blue}→${C.reset} ${m}`)
const err  = (m: string) => log(`  ${C.red}✘${C.reset} ${m}`)

async function main() {
  log(`\n${C.bold}Audit & correction stock Medusa ↔ Odoo${C.reset}`)
  log(`${C.gray}Mode : ${apply ? "APPLY — écriture en DB" : "DRY RUN — lecture seule"}${C.reset}\n`)

  // ── Connexions ────────────────────────────────────────────────────────────
  const odoo = new OdooModuleService({}, {
    url: process.env.ODOO_URL!,
    dbName: process.env.ODOO_DB_NAME!,
    username: process.env.ODOO_USERNAME!,
    apiKey: process.env.ODOO_API_KEY!,
  })
  const svc = odoo as any
  await svc.login()
  log(`${C.green}✔${C.reset} Connecté à Odoo`)

  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await db.connect()
  log(`${C.green}✔${C.reset} Connecté à la base Medusa\n`)

  // ── Récupérer tous les articles Medusa liés à Odoo ────────────────────────
  const { rows } = await db.query<{
    sku: string
    level_id: string
    stocked_quantity: number
    reserved_quantity: number
  }>(`
    SELECT
      pv.sku,
      il.id            AS level_id,
      il.stocked_quantity,
      il.reserved_quantity
    FROM product_variant pv
    JOIN product p           ON p.id = pv.product_id
    JOIN inventory_item ii   ON ii.sku = pv.sku
    JOIN inventory_level il  ON il.inventory_item_id = ii.id
    WHERE p.metadata->>'external_id' IS NOT NULL
      AND pv.sku IS NOT NULL
      AND pv.sku != ''
    ORDER BY pv.sku
  `)

  log(`${C.bold}${rows.length} articles Odoo trouvés dans Medusa${C.reset}\n`)

  const stats = { ok: 0, fixed: 0, notFound: 0, errors: 0 }

  // Batch Odoo : récupérer tous les SKUs en une seule requête pour la perf
  const skus = rows.map(r => r.sku)

  // Odoo search_read pour tous les SKUs d'un coup (par lots de 200)
  const BATCH = 200
  const odooMap = new Map<string, number>() // sku → qty_available

  for (let i = 0; i < skus.length; i += BATCH) {
    const batch = skus.slice(i, i + BATCH)
    try {
      const results: any[] = await svc.client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          svc.options.dbName, svc.uid, svc.options.apiKey,
          "product.product",
          "search_read",
          [[["default_code", "in", batch]]],
          { fields: ["default_code", "qty_available"], context: { active_test: false } },
        ],
      })
      for (const p of results) {
        if (p.default_code) odooMap.set(String(p.default_code), p.qty_available ?? 0)
      }
    } catch (e: any) {
      err(`Erreur batch Odoo [${i}..${i + BATCH}] : ${e.message}`)
    }
    log(`  ${C.gray}Batch Odoo ${i + 1}–${Math.min(i + BATCH, skus.length)} / ${skus.length}${C.reset}`)
  }

  log("")

  // ── Analyser et corriger ──────────────────────────────────────────────────
  const toFix: Array<{ sku: string; levelId: string; currentStocked: number; targetStocked: number; odooQty: number; reserved: number }> = []

  const seenLevelIds = new Set<string>()

  for (const row of rows) {
    // Dédupliquer : plusieurs variantes peuvent partager le même level_id
    if (seenLevelIds.has(row.level_id)) continue
    seenLevelIds.add(row.level_id)

    const odooQty = odooMap.get(row.sku)

    if (odooQty === undefined) {
      warn(`SKU ${row.sku} introuvable dans Odoo (même archivé)`)
      stats.notFound++
      continue
    }

    // Stock négatif dans Odoo = anomalie côté Odoo, on ignore
    if (odooQty < 0) {
      warn(`SKU ${row.sku} : qty_available Odoo = ${odooQty} (négatif, ignoré)`)
      stats.notFound++
      continue
    }

    // pg retourne les colonnes numériques en string — forcer en number
    const reserved       = Number(row.reserved_quantity)
    const currentStocked = Number(row.stocked_quantity)
    const targetStocked  = odooQty + reserved   // available = odooQty

    if (currentStocked !== targetStocked) {
      toFix.push({ sku: row.sku, levelId: row.level_id, currentStocked, targetStocked, odooQty, reserved })
    } else {
      stats.ok++
    }
  }

  // ── Résumé des écarts ─────────────────────────────────────────────────────
  if (toFix.length === 0) {
    ok(`Tous les stocks sont déjà alignés avec Odoo.`)
  } else {
    log(`${C.yellow}${C.bold}${toFix.length} article(s) à corriger :${C.reset}\n`)
    log(
      `  ${"SKU".padEnd(10)} ${"Odoo".padStart(6)} ${"Réservé".padStart(8)} ${"Stocked actuel".padStart(15)} ${"Stocked cible".padStart(14)} ${"Dispo actuelle".padStart(15)} ${"Dispo cible".padStart(12)}`
    )
    log("  " + "─".repeat(90))
    for (const f of toFix) {
      const currentAvailable = f.currentStocked - f.reserved
      const targetAvailable  = f.odooQty
      const changed = currentAvailable !== targetAvailable
      const marker  = changed ? C.yellow : C.gray
      log(
        `  ${marker}${f.sku.padEnd(10)}${C.reset}` +
        ` ${String(f.odooQty).padStart(6)}` +
        ` ${String(f.reserved).padStart(8)}` +
        ` ${String(f.currentStocked).padStart(15)}` +
        ` ${String(f.targetStocked).padStart(14)}` +
        ` ${String(currentAvailable).padStart(15)}` +
        ` ${String(targetAvailable).padStart(12)}`
      )
    }
    log("")
  }

  if (!apply) {
    log(`${C.yellow}${C.bold}DRY RUN — rien modifié.${C.reset}`)
    log(`${C.gray}Relancez avec --apply pour écrire en DB.${C.reset}\n`)
    log(`${C.gray}Résumé : ${stats.ok} OK, ${toFix.length} à corriger, ${stats.notFound} introuvables Odoo, ${stats.errors} erreurs${C.reset}\n`)
    await db.end()
    return
  }

  // ── Application ───────────────────────────────────────────────────────────
  for (const f of toFix) {
    try {
      await db.query(
        "UPDATE inventory_level SET stocked_quantity = $1, updated_at = NOW() WHERE id = $2",
        [f.targetStocked, f.levelId]
      )
      stats.fixed++
      fix(
        `SKU ${f.sku.padEnd(8)} : stocked ${f.currentStocked} → ${f.targetStocked}  (Odoo=${f.odooQty}, réservé=${f.reserved}, dispo: ${f.currentStocked - f.reserved} → ${f.odooQty})`
      )
    } catch (e: any) {
      err(`SKU ${f.sku} : ${e.message}`)
      stats.errors++
    }
  }

  log(`\n${C.green}${C.bold}Terminé.${C.reset}`)
  log(`${C.gray}${stats.ok + stats.fixed} OK, ${stats.fixed} corrigés, ${stats.notFound} introuvables Odoo, ${stats.errors} erreurs${C.reset}\n`)

  await db.end()
}

main().catch(e => { console.error(`\n${C.red}ERREUR FATALE :${C.reset}`, e.message); process.exit(1) })
