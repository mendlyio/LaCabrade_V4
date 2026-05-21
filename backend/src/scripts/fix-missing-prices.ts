#!/usr/bin/env tsx
/**
 * Répare les variantes Medusa qui n'ont aucun price_set associé
 * (et donc affichent "Sur demande" sur le storefront) en récupérant
 * le prix depuis Odoo et en créant le price_set + price via le workflow
 * standard Medusa.
 *
 * Usage :
 *   npx tsx src/scripts/fix-missing-prices.ts          # dry-run
 *   npx tsx src/scripts/fix-missing-prices.ts --apply  # applique
 */
import { loadEnv } from "@medusajs/framework/utils"
loadEnv(process.env.NODE_ENV || "development", process.cwd())

import pg from "pg"

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", cyan: "\x1b[36m", gray: "\x1b[90m", blue: "\x1b[34m",
}
const apply = process.argv.includes("--apply")

async function main() {
  console.log(`\n${C.bold}Réparation des price_sets manquants${C.reset}`)
  console.log(`${C.gray}Mode : ${apply ? "APPLY" : "DRY RUN"}${C.reset}\n`)

  // Création directe en DB : on insère price_set + product_variant_price_set + price.
  // Schéma vérifié manuellement sur la prod (price.amount stocké en EUR, pas minor units).
  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await db.connect()

  // ── 1) Variantes affectées ────────────────────────────────────────────────
  const { rows: variants } = await db.query<{
    variant_id: string
    sku: string
    title: string
    product_id: string
  }>(`
    SELECT pv.id AS variant_id, pv.sku, p.title, p.id AS product_id
    FROM product p
    JOIN product_variant pv         ON pv.product_id = p.id AND pv.deleted_at IS NULL
    LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id AND pvps.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
      AND p.status = 'published'
      AND p.metadata->>'external_id' IS NOT NULL
      AND pv.sku IS NOT NULL
      AND pv.sku != ''
      AND pvps.id IS NULL
    ORDER BY pv.sku
  `)

  if (variants.length === 0) {
    console.log(`${C.green}✔${C.reset} Aucune variante sans price_set\n`)
    await db.end()
    return
  }

  console.log(`${C.yellow}${C.bold}${variants.length} variantes sans price_set${C.reset}\n`)

  // ── 2) Récupérer les prix depuis Odoo en batch ────────────────────────────
  const OdooModule = await import("../modules/odoo/service.js")
  const OdooModuleService: any = (OdooModule as any).default || OdooModule
  const odoo: any = new OdooModuleService({}, {
    url: process.env.ODOO_URL!,
    dbName: process.env.ODOO_DB_NAME!,
    username: process.env.ODOO_USERNAME!,
    apiKey: process.env.ODOO_API_KEY!,
  })
  await odoo.login()

  const skus = variants.map(v => v.sku)
  const odooRows: any[] = await odoo.client.request("call", {
    service: "object", method: "execute_kw",
    args: [
      odoo.options.dbName, odoo.uid, odoo.options.apiKey,
      "product.product", "search_read",
      [[["default_code", "in", skus]]],
      { fields: ["default_code", "list_price", "lst_price", "currency_id"], context: { active_test: false } },
    ],
  })
  const odooBySku = new Map<string, { amount: number; currency: string }>()
  for (const r of odooRows) {
    // Priorité lst_price > list_price (cf. logique resolveOdooPriceAmount)
    const raw = (r.lst_price != null && r.lst_price > 0) ? r.lst_price : r.list_price
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount <= 0) continue
    const currency = (Array.isArray(r.currency_id) ? r.currency_id[1] : "eur")?.toLowerCase() || "eur"
    odooBySku.set(String(r.default_code), { amount, currency })
  }

  console.log(`${C.cyan}${odooBySku.size}/${variants.length}${C.reset} prix Odoo récupérés\n`)

  // ── 3) Récupérer le default_currency_code de la région EUR ────────────────
  // Medusa stocke les prix en "minor units" : pour EUR (2 décimales), 4.99€ = 499.
  // ATTENTION : variant.prices au format workflow attend des EUROS (cf. odooPriceToMedusaAmount).
  // Mais en DB directe, `price.amount` est stocké en minor units numeric.

  // ── 4) Création directe en DB ─────────────────────────────────────────────
  // Schéma Medusa v2 :
  //   price_set (id, created_at, ...)
  //   product_variant_price_set (variant_id, price_set_id)
  //   price (id, price_set_id, currency_code, amount, ...)

  let fixed = 0
  let skipped = 0
  const errors: string[] = []

  for (const v of variants) {
    const odoo = odooBySku.get(v.sku)
    if (!odoo) {
      console.log(`  ${C.gray}-${C.reset} ${v.sku} ${C.gray}(${v.title?.slice(0,40)})${C.reset} : non trouvé Odoo, skip`)
      skipped++
      continue
    }

    // Medusa v2 : price.amount est stocké en EUROS (pas minor units), cf. autres prix en base.
    // Arrondi à 2 décimales pour éviter les artefacts flottants type 22.900000000000002.
    const amount = Math.round(odoo.amount * 100) / 100

    if (!apply) {
      console.log(`  ${C.blue}→${C.reset} ${v.sku.padEnd(8)} ${C.gray}(${v.title?.slice(0,40).padEnd(40)})${C.reset} : ${amount} ${odoo.currency}`)
      fixed++
      continue
    }

    try {
      await db.query("BEGIN")
      const priceSetId = `pset_${cryptoIdSuffix()}`
      const priceId = `price_${cryptoIdSuffix()}`

      // 1) price_set
      await db.query(
        `INSERT INTO price_set (id, created_at, updated_at) VALUES ($1, NOW(), NOW())`,
        [priceSetId]
      )

      // 2) lien variant ↔ price_set
      await db.query(
        `INSERT INTO product_variant_price_set (id, variant_id, price_set_id, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [`pvps_${cryptoIdSuffix()}`, v.variant_id, priceSetId]
      )

      // 3) price (amount en euros, raw_amount au format Medusa)
      await db.query(
        `INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, rules_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, 0, NOW(), NOW())`,
        [priceId, priceSetId, odoo.currency, amount, JSON.stringify({ value: String(amount), precision: 20 })]
      )

      await db.query("COMMIT")
      console.log(`  ${C.green}✔${C.reset} ${v.sku.padEnd(8)} : prix créé ${amount} ${odoo.currency}`)
      fixed++
    } catch (e: any) {
      await db.query("ROLLBACK").catch(() => {})
      errors.push(`${v.sku}: ${e?.message || e}`)
      console.log(`  ${C.red}✘${C.reset} ${v.sku} : ${e?.message || e}`)
    }
  }

  console.log(`\n${C.bold}Résultat :${C.reset} ${fixed} ${apply ? "réparés" : "à réparer"}, ${skipped} skip Odoo, ${errors.length} erreurs\n`)
  if (!apply) console.log(`${C.gray}Relancez avec --apply pour écrire en DB.${C.reset}\n`)
  await db.end()
}

function cryptoIdSuffix(): string {
  // ULID-style suffix : 26 chars base32-lowercase
  const chars = "0123456789abcdefghjkmnpqrstvwxyz"
  let s = ""
  for (let i = 0; i < 26; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

main().catch(e => {
  console.error(`\n${C.red}ERREUR FATALE :${C.reset}`, e?.message || e)
  process.exit(1)
})
