#!/usr/bin/env tsx
/**
 * Diagnostic croisé : SKUs Medusa vs Odoo
 * 
 * Récupère les variantes Medusa depuis la DB, les compare aux produits Odoo,
 * identifie les articles qui ne remonteraient PAS dans une commande Odoo.
 *
 * Usage:
 *   cd backend && npx tsx src/scripts/test-medusa-odoo-sku-match.ts
 */
import { loadEnv } from "@medusajs/framework/utils"
loadEnv(process.env.NODE_ENV || "development", process.cwd())

import pg from "pg"
import OdooModuleService from "../modules/odoo/service"

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m",
  green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", cyan: "\x1b[36m", gray: "\x1b[90m",
}

function ok(msg: string) { console.log(`  ${C.green}✔${C.reset} ${msg}`) }
function fail(msg: string, detail = "") {
  console.log(`  ${C.red}✘ ${C.bold}${msg}${C.reset}`)
  if (detail) console.log(`    ${C.gray}→ ${detail}${C.reset}`)
}
function warn(msg: string) { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`) }
function section(title: string) { console.log(`\n${C.cyan}${C.bold}── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}${C.reset}`) }
function info(msg: string) { console.log(`    ${C.gray}${msg}${C.reset}`) }

async function main() {
  console.log(`\n${C.bold}Diagnostic croisé : SKUs Medusa ↔ Odoo${C.reset}`)
  console.log(`${C.gray}Date: ${new Date().toLocaleString("fr-BE")}${C.reset}`)

  // ─── 1. Connexion DB Medusa ─────────────────────────────────
  section("1. Récupération variantes Medusa (DB)")

  const dbUrl = process.env.DATABASE_URL!
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()

  type MedusaVariant = { id: string; title: string; sku: string | null; product_title: string; product_id: string }

  const { rows: variants } = await client.query<MedusaVariant>(`
    SELECT pv.id, pv.title, pv.sku, p.title AS product_title, p.id AS product_id
    FROM product_variant pv
    JOIN product p ON p.id = pv.product_id
    ORDER BY p.title, pv.title
  `)
  await client.end()

  const total = variants.length
  const withSku = variants.filter(v => v.sku && v.sku.trim())
  const withoutSku = variants.filter(v => !v.sku || !v.sku.trim())
  const gcVariants = variants.filter(v => v.sku?.startsWith("GC-") || v.product_title.toLowerCase().includes("bon cadeau"))

  ok(`${total} variante(s) dans Medusa`)
  info(`Avec SKU: ${withSku.length} | Sans SKU: ${withoutSku.length} | Bons cadeaux (GC): ${gcVariants.length}`)

  if (withoutSku.length > 0) {
    warn(`${withoutSku.length} variante(s) SANS SKU — ne seront jamais envoyées à Odoo :`)
    for (const v of withoutSku.slice(0, 10)) {
      info(`  "${v.product_title}" / "${v.title}" (id: ${v.id})`)
    }
    if (withoutSku.length > 10) info(`  ... et ${withoutSku.length - 10} autres`)
  }

  // ─── 2. Connexion Odoo ───────────────────────────────────────
  section("2. Connexion Odoo")

  const odoo = new OdooModuleService({}, {
    url: process.env.ODOO_URL!,
    dbName: process.env.ODOO_DB_NAME!,
    username: process.env.ODOO_USERNAME!,
    apiKey: process.env.ODOO_API_KEY!,
  })
  await odoo.ping()
  ok("Odoo connecté")

  // ─── 3. Récupérer TOUS les SKUs Odoo (avec pagination) ──────
  section("3. Chargement des SKUs Odoo (toutes les variantes, paginé)")

  const svc = odoo as any
  if (!svc.uid) await svc.login()

  const odooSkuMap = new Map<string, { id: number; name: string; stock: number }>()
  let odooTotal = 0
  const PAGE = 500

  // Compter d'abord
  const totalInOdoo: number = await svc.client.request("call", {
    service: "object", method: "execute_kw",
    args: [svc.options.dbName, svc.uid, svc.options.apiKey,
      "product.product", "search_count", [[["default_code", "!=", false]]]],
  })
  info(`${totalInOdoo} produit(s) avec SKU total dans Odoo — chargement par pages de ${PAGE}...`)

  for (let offset = 0; offset < totalInOdoo; offset += PAGE) {
    const pageProd: any[] = await svc.client.request("call", {
      service: "object", method: "execute_kw",
      args: [svc.options.dbName, svc.uid, svc.options.apiKey,
        "product.product", "search_read",
        [[["default_code", "!=", false]]],
        { fields: ["id", "display_name", "default_code", "qty_available"], limit: PAGE, offset }],
    })
    for (const p of pageProd) {
      if (p.default_code) {
        const entry = { id: p.id, name: p.display_name, stock: p.qty_available }
        odooSkuMap.set(String(p.default_code).trim(), entry)
        odooSkuMap.set(`ODOO-${p.id}`, entry)
      }
    }
    odooTotal += pageProd.length
    process.stdout.write(`\r    ${C.gray}Chargé ${odooTotal}/${totalInOdoo} produits Odoo...${C.reset}`)
  }
  console.log()

  ok(`${odooTotal} produit(s) indexés depuis Odoo (${odooSkuMap.size} entrées dans la map)`)

  // ─── 4. Croisement SKU par SKU ──────────────────────────────
  section("4. Croisement Medusa ↔ Odoo")

  type MatchResult = {
    sku: string; productTitle: string; variantTitle: string
    status: "matched" | "not_in_odoo" | "no_sku" | "gift_card"
    odooId?: number; odooName?: string; stock?: number
  }

  const results: MatchResult[] = []

  for (const v of variants) {
    const sku = v.sku?.trim() || ""
    const isGC = sku.startsWith("GC-") || v.product_title.toLowerCase().includes("bon cadeau")

    if (!sku) {
      results.push({ sku: "(vide)", productTitle: v.product_title, variantTitle: v.title, status: "no_sku" })
      continue
    }
    if (isGC) {
      results.push({ sku, productTitle: v.product_title, variantTitle: v.title, status: "gift_card" })
      continue
    }

    const odooMatch = odooSkuMap.get(sku) || odooSkuMap.get(`ODOO-${sku}`)
    if (odooMatch) {
      results.push({ sku, productTitle: v.product_title, variantTitle: v.title, status: "matched",
        odooId: odooMatch.id, odooName: odooMatch.name, stock: odooMatch.stock })
    } else {
      results.push({ sku, productTitle: v.product_title, variantTitle: v.title, status: "not_in_odoo" })
    }
  }

  const matched = results.filter(r => r.status === "matched")
  const notInOdoo = results.filter(r => r.status === "not_in_odoo")
  const noSku = results.filter(r => r.status === "no_sku")
  const giftCards = results.filter(r => r.status === "gift_card")

  console.log(`\n  Résumé :`)
  ok(`${matched.length} variante(s) matchée(s) → commandes bien remontées dans Odoo`)
  if (giftCards.length) info(`  ${giftCards.length} bon(s) cadeau(x) → ignorés (comportement normal)`)
  if (noSku.length) warn(`${noSku.length} variante(s) sans SKU → JAMAIS envoyées à Odoo`)
  if (notInOdoo.length) fail(`${notInOdoo.length} variante(s) avec SKU mais INTROUVABLES dans Odoo`)

  // ─── 5. Détail des articles problématiques ──────────────────
  if (notInOdoo.length > 0) {
    section("5. Détail articles introuvables dans Odoo")
    for (const r of notInOdoo) {
      info(`  SKU "${r.sku}" — "${r.productTitle}" / "${r.variantTitle}"`)
    }
    console.log()
    warn("Ces articles seront ignorés lors d'une commande. Si ce sont des vrais produits, vérifier leur default_code dans Odoo.")
  } else {
    section("5. Détail articles introuvables dans Odoo")
    ok("Aucun article problématique — tous les SKUs Medusa matchent Odoo !")
  }

  // ─── 6. Bons cadeaux ────────────────────────────────────────
  if (giftCards.length > 0) {
    section("6. Bons cadeaux (comportement attendu)")
    for (const r of giftCards) {
      info(`  SKU "${r.sku}" — "${r.productTitle}"`)
    }
    ok(`Les ${giftCards.length} bon(s) cadeau(x) sont correctement ignorés dans la sync Odoo`)
  }

  // ─── 7. Échantillon des articles bien matchés ───────────────
  section("7. Échantillon articles bien matchés (10 premiers)")
  for (const r of matched.slice(0, 10)) {
    info(`  ✔ SKU ${r.sku.padEnd(8)} → Odoo #${r.odooId} "${r.odooName?.slice(0, 40)}" | Stock: ${r.stock}`)
  }
  if (matched.length > 10) info(`  ... et ${matched.length - 10} autres`)

  // ─── Résumé final ────────────────────────────────────────────
  console.log(`\n${"═".repeat(65)}`)
  console.log(`${C.bold}RÉSULTAT FINAL${C.reset}`)
  console.log(`  Variantes totales Medusa : ${total}`)
  console.log(`  ${C.green}Matchées Odoo   : ${matched.length}${C.reset}`)
  console.log(`  ${C.gray}Bons cadeaux    : ${giftCards.length} (ignorés, normal)${C.reset}`)
  console.log(`  ${C.yellow}Sans SKU        : ${noSku.length}${noSku.length > 0 ? " ⚠" : ""}${C.reset}`)
  console.log(`  ${notInOdoo.length > 0 ? C.red : C.green}SKU sans match  : ${notInOdoo.length}${notInOdoo.length > 0 ? " ✘" : " ✔"}${C.reset}`)
  console.log(`${"═".repeat(65)}\n`)

  if (notInOdoo.length === 0 && noSku.length === 0) {
    console.log(`${C.green}${C.bold}Tout est OK — toutes les commandes remonteront correctement dans Odoo.${C.reset}\n`)
  } else if (notInOdoo.length === 0) {
    console.log(`${C.yellow}${C.bold}Les commandes remonteront dans Odoo, mais ${noSku.length} variante(s) sans SKU seront toujours ignorées.${C.reset}\n`)
  } else {
    console.log(`${C.red}${C.bold}Attention : ${notInOdoo.length} article(s) ne remonteront pas dans Odoo (SKU introuvable).${C.reset}\n`)
  }
}

main().catch(e => {
  console.error(`\n${C.red}Erreur fatale:${C.reset}`, e.message)
  process.exit(1)
})
