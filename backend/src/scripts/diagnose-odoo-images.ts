/**
 * Script de diagnostic pour identifier comment Odoo stocke les images produits
 * Usage: npx tsx src/scripts/diagnose-odoo-images.ts <product_id>
 */

import * as dotenv from "dotenv"
import * as path from "path"
import OdooModuleService from "../modules/odoo/service"

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

async function diagnoseOdooImages(productId?: number) {
  console.log(`\n🔍 ===== DIAGNOSTIC IMAGES ODOO =====\n`)

  const odooService = new OdooModuleService(
    {
      resolve: () => null,
    } as any,
    {
      url: process.env.ODOO_URL!,
      dbName: process.env.ODOO_DB_NAME!,
      username: process.env.ODOO_USERNAME!,
      apiKey: process.env.ODOO_API_KEY!,
    }
  )

  try {
    await odooService.login()
    console.log(`✅ Connecté à Odoo: ${process.env.ODOO_URL}`)
    console.log(`   DB: ${process.env.ODOO_DB_NAME}\n`)

    // 1. Lister les champs disponibles sur product.template
    console.log(`📋 ÉTAPE 1: Champs disponibles sur 'product.template'`)
    console.log(`─────────────────────────────────────────────────────\n`)

    const templateFields = await (odooService as any).client.request("call", {
      service: "object",
      method: "execute_kw",
      args: [
        process.env.ODOO_DB_NAME,
        (odooService as any).uid,
        process.env.ODOO_API_KEY,
        "product.template",
        "fields_get",
        [],
        {
          attributes: ["string", "type", "relation", "help"],
        },
      ],
    })

    const imageRelatedFields = Object.entries(templateFields)
      .filter(([key, value]: [string, any]) => 
        key.toLowerCase().includes("image") || 
        value.string?.toLowerCase().includes("image") ||
        value.help?.toLowerCase().includes("image")
      )
      .map(([key, value]: [string, any]) => ({
        field: key,
        label: value.string,
        type: value.type,
        relation: value.relation,
        help: value.help,
      }))

    console.log(`Champs liés aux images trouvés (${imageRelatedFields.length}) :\n`)
    imageRelatedFields.forEach((field) => {
      console.log(`  📸 ${field.field}`)
      console.log(`     Label: ${field.label}`)
      console.log(`     Type: ${field.type}`)
      if (field.relation) console.log(`     Relation: ${field.relation}`)
      if (field.help) console.log(`     Description: ${field.help}`)
      console.log()
    })

    // 2. Si un product_id est fourni, récupérer ses données
    if (productId) {
      console.log(`\n📦 ÉTAPE 2: Données du produit ${productId}`)
      console.log(`─────────────────────────────────────────────────────\n`)

      // Récupérer avec tous les champs image trouvés
      const imageFields = imageRelatedFields.map(f => f.field)
      const product = await (odooService as any).client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          process.env.ODOO_DB_NAME,
          (odooService as any).uid,
          process.env.ODOO_API_KEY,
          "product.template",
          "read",
          [[productId]],
          { fields: ["id", "name", "display_name", ...imageFields] },
        ],
      })

      if (product && product.length > 0) {
        const prod = product[0]
        console.log(`Produit: ${prod.display_name} (ID: ${prod.id})\n`)
        
        imageFields.forEach((field) => {
          const value = prod[field]
          if (value !== undefined && value !== false) {
            console.log(`  ${field}:`)
            if (typeof value === "string" && value.length > 100) {
              console.log(`    → Base64 string (${value.length} caractères)`)
            } else if (Array.isArray(value)) {
              console.log(`    → Array de ${value.length} élément(s): ${JSON.stringify(value)}`)
            } else {
              console.log(`    → ${JSON.stringify(value)}`)
            }
          }
        })
      } else {
        console.log(`❌ Produit ${productId} non trouvé`)
      }
    }

    // 3. Vérifier si le modèle product.image existe
    console.log(`\n🖼️  ÉTAPE 3: Modèle 'product.image'`)
    console.log(`─────────────────────────────────────────────────────\n`)

    try {
      const imageModelFields = await (odooService as any).client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          process.env.ODOO_DB_NAME,
          (odooService as any).uid,
          process.env.ODOO_API_KEY,
          "product.image",
          "fields_get",
          [],
          { attributes: ["string", "type"] },
        ],
      })

      console.log(`✅ Le modèle 'product.image' existe !`)
      console.log(`   Champs disponibles:\n`)
      Object.entries(imageModelFields).forEach(([key, value]: [string, any]) => {
        console.log(`   - ${key}: ${value.string} (${value.type})`)
      })
    } catch (error: any) {
      console.log(`❌ Le modèle 'product.image' n'existe pas`)
      console.log(`   Message: ${error.message}\n`)
      console.log(`   → Votre Odoo utilise probablement une autre méthode pour stocker les images`)
    }

    // 4. Chercher un produit avec plusieurs images
    if (!productId) {
      console.log(`\n🔎 ÉTAPE 4: Recherche produits avec images multiples`)
      console.log(`─────────────────────────────────────────────────────\n`)

      // Chercher les champs qui pourraient contenir des IDs d'images
      const potentialImageIdFields = imageRelatedFields
        .filter(f => f.type === "one2many" || f.type === "many2many")
        .map(f => f.field)

      if (potentialImageIdFields.length > 0) {
        console.log(`Recherche dans les champs: ${potentialImageIdFields.join(", ")}\n`)

        const products = await (odooService as any).client.request("call", {
          service: "object",
          method: "execute_kw",
          args: [
            process.env.ODOO_DB_NAME,
            (odooService as any).uid,
            process.env.ODOO_API_KEY,
            "product.template",
            "search_read",
            [[], ["id", "display_name", ...potentialImageIdFields]],
            { limit: 50 },
          ],
        })

        const productsWithMultipleImages = products.filter((p: any) => {
          return potentialImageIdFields.some((field) => {
            const value = p[field]
            return Array.isArray(value) && value.length > 0
          })
        })

        console.log(`${productsWithMultipleImages.length} produit(s) avec images trouvé(s):\n`)
        productsWithMultipleImages.slice(0, 5).forEach((p: any) => {
          console.log(`  📦 ${p.display_name} (ID: ${p.id})`)
          potentialImageIdFields.forEach((field) => {
            const value = p[field]
            if (Array.isArray(value) && value.length > 0) {
              console.log(`     → ${field}: ${value.length} image(s) - IDs: ${JSON.stringify(value)}`)
            }
          })
        })

        if (productsWithMultipleImages.length > 0) {
          const example = productsWithMultipleImages[0]
          console.log(`\n💡 Pour tester avec un produit spécifique, relancez:`)
          console.log(`   npx tsx src/scripts/diagnose-odoo-images.ts ${example.id}`)
        }
      } else {
        console.log(`Aucun champ de type relation trouvé pour les images`)
      }
    }

    console.log(`\n✅ ===== FIN DU DIAGNOSTIC =====\n`)
  } catch (error: any) {
    console.error(`\n❌ Erreur:`, error.message)
    console.error(error.stack)
  }
}

// Exécution
const productId = process.argv[2] ? parseInt(process.argv[2]) : undefined
diagnoseOdooImages(productId)

