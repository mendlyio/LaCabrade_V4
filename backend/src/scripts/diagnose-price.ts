#!/usr/bin/env tsx
/**
 * Script de diagnostic des prix Odoo
 * Usage: npx tsx src/scripts/diagnose-price.ts <odoo_template_id>
 * Exemple: npx tsx src/scripts/diagnose-price.ts 11602
 */
import OdooModuleService from "../modules/odoo/service"

async function main() {
  const templateId = parseInt(process.argv[2] || "11602")
  
  console.log(`\n🔍 Diagnostic prix Odoo pour template ID: ${templateId}\n`)
  
  const required = ["ODOO_URL", "ODOO_DB_NAME", "ODOO_USERNAME", "ODOO_API_KEY"]
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.error("❌ Variables manquantes:", missing.join(", "))
    process.exit(1)
  }

  const odooService = new OdooModuleService({}, {
    url: process.env.ODOO_URL!,
    dbName: process.env.ODOO_DB_NAME!,
    username: process.env.ODOO_USERNAME!,
    apiKey: process.env.ODOO_API_KEY!,
  })

  try {
    // 1) Lire le product.template
    console.log("━━━ 1. PRODUCT.TEMPLATE (le template) ━━━")
    await (odooService as any).login()
    const uid = (odooService as any).uid
    const client = (odooService as any).client
    const dbName = process.env.ODOO_DB_NAME!
    const apiKey = process.env.ODOO_API_KEY!

    const templates = await client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        dbName, uid, apiKey,
        "product.template", "read", [[templateId]],
        {
          fields: [
            "name", "list_price", "display_name",
            "product_variant_ids", "product_variant_count",
            "default_code", "currency_id",
          ],
        },
      ],
    })

    if (!templates.length) {
      console.error(`❌ Template ${templateId} non trouvé dans Odoo`)
      process.exit(1)
    }

    const tmpl = templates[0]
    console.log(`  Nom:                ${tmpl.display_name}`)
    console.log(`  list_price:         ${tmpl.list_price}`)
    console.log(`  default_code:       ${tmpl.default_code}`)
    console.log(`  currency_id:        ${JSON.stringify(tmpl.currency_id)}`)
    console.log(`  variant_count:      ${tmpl.product_variant_count}`)
    console.log(`  product_variant_ids: ${JSON.stringify(tmpl.product_variant_ids)}`)

    // 2) Lire les product.product (variantes)
    const variantIds = tmpl.product_variant_ids
    if (variantIds?.length) {
      console.log(`\n━━━ 2. PRODUCT.PRODUCT (les variantes) ━━━`)
      const variants = await client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          dbName, uid, apiKey,
          "product.product", "read", [variantIds],
          {
            fields: [
              "display_name", "list_price", "lst_price",
              "default_code", "barcode", "currency_id",
              "price_extra", "qty_available", "standard_price",
              "product_tmpl_id",
            ],
          },
        ],
      })

      for (const v of variants) {
        console.log(`\n  --- Variante ID ${v.id} ---`)
        console.log(`    display_name:  ${v.display_name}`)
        console.log(`    default_code:  ${v.default_code}`)
        console.log(`    barcode:       ${v.barcode}`)
        console.log(`    list_price:    ${v.list_price}`)
        console.log(`    lst_price:     ${v.lst_price}`)
        console.log(`    standard_price(coût): ${v.standard_price}`)
        console.log(`    price_extra:   ${v.price_extra}`)
        console.log(`    currency_id:   ${JSON.stringify(v.currency_id)}`)
        console.log(`    qty_available: ${v.qty_available}`)
      }
    }

    // 3) Vérifier les pricelists
    console.log(`\n━━━ 3. PRICELISTS (listes de prix) ━━━`)
    try {
      const pricelists = await client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          dbName, uid, apiKey,
          "product.pricelist", "search_read", [[]],
          {
            fields: ["name", "currency_id", "active"],
          },
        ],
      })
      for (const pl of pricelists) {
        console.log(`  Pricelist: ${pl.name} (ID: ${pl.id}, active: ${pl.active})`)
        
        // Chercher les règles de prix pour ce template
        const rules = await client.request("call", {
          service: "object",
          method: "execute_kw",
          args: [
            dbName, uid, apiKey,
            "product.pricelist.item", "search_read",
            [[
              ["pricelist_id", "=", pl.id],
              "|",
              ["product_tmpl_id", "=", templateId],
              ["product_id", "in", variantIds || []],
            ]],
            {
              fields: [
                "product_tmpl_id", "product_id",
                "compute_price", "fixed_price", "percent_price",
                "min_quantity", "date_start", "date_end",
              ],
            },
          ],
        })
        if (rules.length) {
          for (const r of rules) {
            console.log(`    → Règle ID ${r.id}: compute=${r.compute_price}, fixed=${r.fixed_price}, %=${r.percent_price}`)
          }
        }
      }
    } catch (e: any) {
      console.log(`  ⚠️ Erreur lecture pricelists: ${e.message}`)
    }

    // 4) Tester price_compute (le prix calculé par Odoo)
    console.log(`\n━━━ 4. PRIX CALCULÉ (via product.product) ━━━`)
    try {
      if (variantIds?.length) {
        const computedPrices = await client.request("call", {
          service: "object",
          method: "execute_kw",
          args: [
            dbName, uid, apiKey,
            "product.product", "read", [variantIds],
            {
              fields: ["lst_price", "standard_price"],
            },
          ],
        })
        for (const cp of computedPrices) {
          console.log(`  Variante ${cp.id}: lst_price=${cp.lst_price}, standard_price(coût)=${cp.standard_price}`)
        }
      }
    } catch (e: any) {
      console.log(`  ⚠️ Erreur: ${e.message}`)
    }

    console.log(`\n✅ Diagnostic terminé\n`)
    process.exit(0)
  } catch (error: any) {
    console.error(`\n❌ Erreur: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
