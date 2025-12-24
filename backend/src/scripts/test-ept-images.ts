/**
 * Test de récupération des images depuis common.product.image.ept
 */

import * as dotenv from "dotenv"
import * as path from "path"
import OdooModuleService from "../modules/odoo/service"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })

async function testEptImages() {
  const odooService = new OdooModuleService(
    { resolve: () => null } as any,
    {
      url: process.env.ODOO_URL!,
      dbName: process.env.ODOO_DB_NAME!,
      username: process.env.ODOO_USERNAME!,
      apiKey: process.env.ODOO_API_KEY!,
    }
  )

  await odooService.login()
  console.log(`✅ Connecté à Odoo\n`)

  // 1. Voir les champs disponibles sur common.product.image.ept
  console.log(`📋 Champs disponibles sur 'common.product.image.ept':\n`)
  
  const fields = await (odooService as any).client.request("call", {
    service: "object",
    method: "execute_kw",
    args: [
      process.env.ODOO_DB_NAME,
      (odooService as any).uid,
      process.env.ODOO_API_KEY,
      "common.product.image.ept",
      "fields_get",
      [],
      { attributes: ["string", "type"] },
    ],
  })

  Object.entries(fields).forEach(([key, value]: [string, any]) => {
    console.log(`  - ${key}: ${value.string} (${value.type})`)
  })

  // 2. Récupérer les images du produit 17302 (IDs: 18943, 18942)
  console.log(`\n📸 Récupération des images [18943, 18942]:\n`)

  const images = await (odooService as any).client.request("call", {
    service: "object",
    method: "execute_kw",
    args: [
      process.env.ODOO_DB_NAME,
      (odooService as any).uid,
      process.env.ODOO_API_KEY,
      "common.product.image.ept",
      "read",
      [[18943, 18942]],
      {}, // Tous les champs
    ],
  })

  images.forEach((img: any) => {
    console.log(`\n  Image ID ${img.id}:`)
    Object.entries(img).forEach(([key, value]) => {
      if (typeof value === "string" && value.length > 100) {
        console.log(`    ${key}: Base64 (${value.length} chars)`)
      } else if (Array.isArray(value)) {
        console.log(`    ${key}: [${value.join(", ")}]`)
      } else {
        console.log(`    ${key}: ${JSON.stringify(value)}`)
      }
    })
  })

  console.log(`\n✅ Test terminé`)
}

testEptImages().catch(console.error)

