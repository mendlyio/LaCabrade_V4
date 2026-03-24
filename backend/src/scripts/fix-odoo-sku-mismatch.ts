#!/usr/bin/env tsx
/**
 * Correction SKUs ODOO-{id} dans Medusa + recherche précise dans Odoo
 * Usage: cd backend && npx tsx src/scripts/fix-odoo-sku-mismatch.ts [--apply]
 */
import { loadEnv } from "@medusajs/framework/utils"
loadEnv(process.env.NODE_ENV || "development", process.cwd())
import OdooModuleService from "../modules/odoo/service"
import pg from "pg"

const C = { reset: "\x1b[0m", bold: "\x1b[1m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m", gray: "\x1b[90m" }
const apply = process.argv.includes("--apply")

function section(t: string) { console.log(`\n${C.cyan}${C.bold}── ${t} ${"─".repeat(Math.max(0, 60 - t.length))}${C.reset}`) }
function info(m: string) { console.log(`    ${C.gray}${m}${C.reset}`) }
function ok(m: string) { console.log(`  ${C.green}✔${C.reset} ${m}`) }
function warn(m: string) { console.log(`  ${C.yellow}⚠${C.reset} ${m}`) }

async function searchOdooVariantsForTemplate(svc: any, templateId: number) {
  return svc.client.request("call", {
    service: "object", method: "execute_kw",
    args: [svc.options.dbName, svc.uid, svc.options.apiKey,
      "product.product", "search_read",
      [[["product_tmpl_id", "=", templateId]]],
      { fields: ["id", "display_name", "default_code", "active"], context: { active_test: false } }],
  })
}

async function main() {
  console.log(`\n${C.bold}Correction SKUs ODOO-{id} dans Medusa${C.reset}`)
  console.log(`${C.gray}Mode : ${apply ? "APPLY — écriture en DB" : "DRY RUN — lecture seule"}${C.reset}`)

  const odoo = new OdooModuleService({}, {
    url: process.env.ODOO_URL!, dbName: process.env.ODOO_DB_NAME!,
    username: process.env.ODOO_USERNAME!, apiKey: process.env.ODOO_API_KEY!,
  })
  const svc = odoo as any
  await svc.login()

  const dbClient = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await dbClient.connect()

  // ─── 1. Récupérer variantes Medusa ODOO-{id} ─────────────────
  section("1. Variantes Medusa format ODOO-{id}")

  const { rows: odooFmtVars } = await dbClient.query(`
    SELECT pv.id, pv.sku, pv.title, p.title AS product_title
    FROM product_variant pv
    JOIN product p ON p.id = pv.product_id
    WHERE pv.sku LIKE 'ODOO-%'
    ORDER BY p.title
  `)

  if (odooFmtVars.length === 0) {
    ok("Aucune variante ODOO-{id} — rien à corriger.")
    await dbClient.end()
    return
  }
  for (const v of odooFmtVars) info(`"${v.product_title}" SKU="${v.sku}"`)

  // ─── 2. Résoudre chaque ODOO-{id} précisément ────────────────
  section("2. Résolution précise dans Odoo")

  type Fix = { variantId: string; oldSku: string; newSku: string; productTitle: string; note: string }
  const fixes: Fix[] = []
  const skipped: string[] = []

  for (const v of odooFmtVars) {
    const odooIdRaw = parseInt(v.sku.replace("ODOO-", ""))
    info(`\n  Analyse "${v.product_title}" (${v.sku}, odooId=${odooIdRaw})`)

    // Stratégie 1 : le ODOO-{id} correspond à un product.template → chercher ses variantes
    const tmplVariants: any[] = await searchOdooVariantsForTemplate(svc, odooIdRaw)
    if (tmplVariants.length > 0) {
      info(`  → ${tmplVariants.length} variante(s) du template ${odooIdRaw}:`)
      for (const pv of tmplVariants) {
        info(`    product.product #${pv.id} | default_code="${pv.default_code}" | active=${pv.active} | "${pv.display_name}"`)
      }

      // Prendre la variante avec un default_code, en préférant les actives
      const best = tmplVariants.find(pv => pv.default_code && pv.active)
        || tmplVariants.find(pv => pv.default_code)

      if (best?.default_code) {
        fixes.push({ variantId: v.id, oldSku: v.sku, newSku: best.default_code, productTitle: v.product_title, note: `product.product #${best.id}` })
        console.log(`  ${C.green}→ CORRECTION : ${v.sku} → ${best.default_code}${C.reset}`)
        continue
      }
    }

    // Stratégie 2 : le ODOO-{id} est un product.product direct
    const ppDirect: any[] = await svc.client.request("call", {
      service: "object", method: "execute_kw",
      args: [svc.options.dbName, svc.uid, svc.options.apiKey,
        "product.product", "search_read",
        [[["id", "=", odooIdRaw]]],
        { fields: ["id", "display_name", "default_code", "active", "product_tmpl_id"], context: { active_test: false } }],
    })

    if (ppDirect.length > 0) {
      const p = ppDirect[0]
      info(`  → product.product direct #${p.id}: "${p.display_name}" | default_code="${p.default_code}" | active=${p.active}`)

      if (p.default_code && p.display_name !== "[12369] COUVERTURE 381155" && p.display_name !== "[13883] COL CHASSE RACE 2 1120") {
        fixes.push({ variantId: v.id, oldSku: v.sku, newSku: p.default_code, productTitle: v.product_title, note: `product.product direct #${p.id}` })
        console.log(`  ${C.green}→ CORRECTION : ${v.sku} → ${p.default_code}${C.reset}`)
        continue
      }

      // Ce product.product est un autre produit — chercher par nom précis dans les templates
      info(`  → Le product.product ${odooIdRaw} est un autre produit. Recherche par nom exact...`)
      const tmplName = v.product_title.replace(" S/R", "").trim()
      const byExactName: any[] = await svc.client.request("call", {
        service: "object", method: "execute_kw",
        args: [svc.options.dbName, svc.uid, svc.options.apiKey,
          "product.template", "search_read",
          [[["name", "=", v.product_title]]],
          { fields: ["id", "name", "default_code", "active"], context: { active_test: false } }],
      })
      if (byExactName.length === 0) {
        // Essayer sans S/R
        const byFuzzyName: any[] = await svc.client.request("call", {
          service: "object", method: "execute_kw",
          args: [svc.options.dbName, svc.uid, svc.options.apiKey,
            "product.template", "search_read",
            [[["name", "ilike", tmplName]]],
            { fields: ["id", "name", "default_code", "active"], context: { active_test: false }, limit: 5 }],
        })
        info(`  → Recherche ilike "${tmplName}": ${byFuzzyName.length} résultat(s)`)
        for (const t of byFuzzyName) info(`    template #${t.id} "${t.name}" | default_code="${t.default_code}" | active=${t.active}`)

        // Trouver le template dont le nom matche précisément le produit Medusa
        const exactMatch = byFuzzyName.find(t => t.name === v.product_title || t.name.includes(tmplName))
        if (exactMatch) {
          const exactVars: any[] = await searchOdooVariantsForTemplate(svc, exactMatch.id)
          info(`  → Variantes du template exact #${exactMatch.id}:`)
          for (const ev of exactVars) info(`    product.product #${ev.id} | default_code="${ev.default_code}" | "${ev.display_name}"`)

          const bestExact = exactVars.find(pv => pv.default_code && pv.active) || exactVars.find(pv => pv.default_code)
          if (bestExact?.default_code) {
            fixes.push({ variantId: v.id, oldSku: v.sku, newSku: bestExact.default_code, productTitle: v.product_title, note: `template #${exactMatch.id} → product.product #${bestExact.id}` })
            console.log(`  ${C.green}→ CORRECTION : ${v.sku} → ${bestExact.default_code}${C.reset}`)
            continue
          }
        }
      } else {
        info(`  → Template exact trouvé: #${byExactName[0].id} "${byExactName[0].name}"`)
        const tmplVars: any[] = await searchOdooVariantsForTemplate(svc, byExactName[0].id)
        for (const tv of tmplVars) info(`    product.product #${tv.id} | default_code="${tv.default_code}" | "${tv.display_name}"`)

        const bestTmpl = tmplVars.find(pv => pv.default_code && pv.active) || tmplVars.find(pv => pv.default_code)
        if (bestTmpl?.default_code) {
          fixes.push({ variantId: v.id, oldSku: v.sku, newSku: bestTmpl.default_code, productTitle: v.product_title, note: `template exact → product.product #${bestTmpl.id}` })
          console.log(`  ${C.green}→ CORRECTION : ${v.sku} → ${bestTmpl.default_code}${C.reset}`)
          continue
        }
      }
    }

    warn(`Impossible de résoudre "${v.product_title}" (${v.sku}) → ignoré (pas de default_code dans Odoo)`)
    skipped.push(v.product_title)
  }

  // ─── 3. Résumé et application ─────────────────────────────────
  section("3. Résumé des corrections")

  if (fixes.length === 0) {
    warn("Aucune correction applicable.")
    await dbClient.end()
    return
  }

  for (const f of fixes) {
    console.log(`  "${f.productTitle}"`)
    info(`    ${f.oldSku} → ${f.newSku}  (${f.note})`)
  }
  if (skipped.length > 0) {
    warn(`${skipped.length} ignoré(s) (pas de SKU dans Odoo) :`)
    for (const s of skipped) info(`  "${s}"`)
  }

  if (!apply) {
    console.log(`\n  ${C.yellow}${C.bold}DRY RUN — rien modifié.${C.reset}`)
    console.log(`  ${C.gray}Relancez avec --apply pour écrire en DB.${C.reset}\n`)
  } else {
    for (const f of fixes) {
      await dbClient.query("UPDATE product_variant SET sku = $1 WHERE id = $2", [f.newSku, f.variantId])
      ok(`"${f.productTitle}" : ${f.oldSku} → ${f.newSku}`)
    }
    ok(`${fixes.length} variante(s) corrigée(s) en DB !`)
  }

  await dbClient.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
