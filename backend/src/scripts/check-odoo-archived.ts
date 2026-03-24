#!/usr/bin/env tsx
import { loadEnv } from "@medusajs/framework/utils"
loadEnv(process.env.NODE_ENV || "development", process.cwd())
import OdooModuleService from "../modules/odoo/service"

const problematicSkus = [
  "15271","17111","67136","69894","14705",
  "58397","58398","68678","58395","51642",
  "70166","70167","71855","70163","71856","70162",
  "72061","59751","35682","37358","14876",
  "70502","70504","70503","70498","70501",
  "15278","26834","70969","70212","70211",
  "74074","61588","16540"
]

async function main() {
  const odoo = new OdooModuleService({}, {
    url: process.env.ODOO_URL!, dbName: process.env.ODOO_DB_NAME!,
    username: process.env.ODOO_USERNAME!, apiKey: process.env.ODOO_API_KEY!,
  })
  const svc = odoo as any
  await svc.login()

  // 1. Vérifier les produits ODOO-{id}
  const byId = await svc.client.request("call", {
    service: "object", method: "execute_kw",
    args: [svc.options.dbName, svc.uid, svc.options.apiKey,
      "product.product", "search_read",
      [[["id", "in", [18386, 18613]]]],
      { fields: ["id", "display_name", "default_code", "active", "qty_available"], context: { active_test: false } }],
  })
  console.log("\n=== ODOO-{id} products ===")
  for (const p of byId) {
    console.log(`  ID=${p.id} SKU="${p.default_code}" active=${p.active} "${p.display_name}"`)
  }

  // 2. Vérifier les 34 SKUs problématiques — sont-ils archivés dans Odoo ?
  const found = await svc.client.request("call", {
    service: "object", method: "execute_kw",
    args: [svc.options.dbName, svc.uid, svc.options.apiKey,
      "product.product", "search_read",
      [[["default_code", "in", problematicSkus]]],
      { fields: ["id", "display_name", "default_code", "active"], context: { active_test: false } }],
  })
  console.log("\n=== Produits problématiques trouvés dans Odoo (avec active_test:false) ===")
  const foundSkus = new Set(found.map((p: any) => p.default_code))
  for (const p of found) {
    console.log(`  SKU="${p.default_code}" active=${p.active} "${p.display_name}"`)
  }

  const notFound = problematicSkus.filter(s => !foundSkus.has(s))
  console.log(`\n=== SKUs vraiment introuvables dans Odoo (même archivés) ===`)
  for (const s of notFound) console.log(`  SKU "${s}" → n'existe pas du tout dans Odoo`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
