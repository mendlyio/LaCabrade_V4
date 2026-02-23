#!/usr/bin/env tsx
/**
 * Cherche un produit Odoo par SKU directement dans product.product
 */
import OdooModuleService from "../modules/odoo/service"

async function main() {
  const sku = process.argv[2] || "40773"
  console.log(`\n🔍 Recherche SKU "${sku}" dans product.product...\n`)

  const odooService = new OdooModuleService({}, {
    url: process.env.ODOO_URL!,
    dbName: process.env.ODOO_DB_NAME!,
    username: process.env.ODOO_USERNAME!,
    apiKey: process.env.ODOO_API_KEY!,
  })

  await (odooService as any).login()
  const uid = (odooService as any).uid
  const client = (odooService as any).client
  const dbName = process.env.ODOO_DB_NAME!
  const apiKey = process.env.ODOO_API_KEY!

  // Chercher par default_code OU barcode
  const productIds = await client.request("call", {
    service: "object",
    method: "execute_kw",
    args: [
      dbName, uid, apiKey,
      "product.product", "search",
      [["|", ["default_code", "=", sku], ["barcode", "=", sku]]],
    ],
  })

  console.log(`  IDs trouvés: ${JSON.stringify(productIds)}`)

  if (productIds.length > 0) {
    const products = await client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        dbName, uid, apiKey,
        "product.product", "read", [productIds],
        { fields: ["display_name", "list_price", "lst_price", "standard_price", "default_code", "barcode", "qty_available", "active", "product_tmpl_id"] },
      ],
    })
    for (const p of products) {
      console.log(`\n  ID: ${p.id}`)
      console.log(`  Nom: ${p.display_name}`)
      console.log(`  active: ${p.active}`)
      console.log(`  list_price: ${p.list_price}`)
      console.log(`  lst_price: ${p.lst_price}`)
      console.log(`  standard_price: ${p.standard_price}`)
      console.log(`  product_tmpl_id: ${JSON.stringify(p.product_tmpl_id)}`)
      console.log(`  qty_available: ${p.qty_available}`)
    }
  }

  // Chercher aussi dans les archivés
  console.log(`\n  Recherche dans les archivés...`)
  const archivedIds = await client.request("call", {
    service: "object",
    method: "execute_kw",
    args: [
      dbName, uid, apiKey,
      "product.product", "search",
      [["|", ["default_code", "=", sku], ["barcode", "=", sku], ["active", "=", false]]],
    ],
  })
  console.log(`  IDs archivés: ${JSON.stringify(archivedIds)}`)

  console.log(`\n✅ Terminé\n`)
}

main().catch(console.error)
