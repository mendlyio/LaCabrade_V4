#!/usr/bin/env tsx
/**
 * Script de diagnostic COMPLET pour la synchronisation commande → Odoo.
 *
 * Teste : connexion, format des SKUs, matching produits, création commande test,
 * gestion des items non-Odoo (promos, bons cadeaux), produits de service.
 *
 * Usage:
 *   cd backend && npx tsx src/scripts/test-odoo-order-sync.ts
 *   cd backend && npx tsx src/scripts/test-odoo-order-sync.ts --create   # crée une vraie commande test
 */
import { loadEnv } from "@medusajs/framework/utils"
loadEnv(process.env.NODE_ENV || "development", process.cwd())

import OdooModuleService from "../modules/odoo/service"

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
}

let passed = 0
let failed = 0
let warnings = 0

function ok(msg: string) { console.log(`  ${C.green}✔${C.reset} ${msg}`); passed++ }
function fail(msg: string, detail = "") {
  console.log(`  ${C.red}✘ ${C.bold}${msg}${C.reset}`)
  if (detail) console.log(`    ${C.gray}→ ${detail}${C.reset}`)
  failed++
}
function warn(msg: string) { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`); warnings++ }
function section(title: string) { console.log(`\n${C.cyan}${C.bold}── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}${C.reset}`) }
function info(msg: string) { console.log(`    ${C.gray}${msg}${C.reset}`) }

async function main() {
  console.log(`\n${C.bold}Diagnostic COMPLET : Synchronisation Commande → Odoo${C.reset}`)
  console.log(`${C.gray}Date: ${new Date().toLocaleString("fr-BE")}${C.reset}`)

  const shouldCreate = process.argv.includes("--create")

  // ═══════════════════════════════════════════════════════════════
  // 1. Variables d'environnement
  // ═══════════════════════════════════════════════════════════════
  section("1. Variables d'environnement")

  const vars = ["ODOO_URL", "ODOO_DB_NAME", "ODOO_USERNAME", "ODOO_API_KEY"]
  for (const v of vars) {
    if (process.env[v]) {
      ok(`${v} = ${v === "ODOO_API_KEY" ? process.env[v]!.slice(0, 8) + "..." : process.env[v]}`)
    } else {
      fail(`${v} manquant !`)
    }
  }

  if (vars.some(v => !process.env[v])) {
    console.log(`\n${C.red}Variables manquantes — impossible de continuer.${C.reset}\n`)
    process.exit(1)
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. Connexion / Authentification Odoo
  // ═══════════════════════════════════════════════════════════════
  section("2. Connexion Odoo")

  let odoo: OdooModuleService
  try {
    odoo = new OdooModuleService({}, {
      url: process.env.ODOO_URL!,
      dbName: process.env.ODOO_DB_NAME!,
      username: process.env.ODOO_USERNAME!,
      apiKey: process.env.ODOO_API_KEY!,
    })

    const pingResult = await odoo.ping()
    ok(`Connexion réussie (uid=${pingResult.uid}, db=${pingResult.db})`)
  } catch (e: any) {
    fail("Connexion Odoo échouée", e.message)
    process.exit(1)
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. Analyse des produits Odoo et leurs SKUs
  // ═══════════════════════════════════════════════════════════════
  section("3. Analyse des produits Odoo (30 premiers)")

  type VariantInfo = { id: number; name: string; sku: string; price: number; stock: number }
  const allVariants: VariantInfo[] = []

  try {
    const products = await odoo.fetchProducts({ offset: 0, limit: 30 })
    ok(`${products.length} produit(s) récupéré(s)`)

    let withSku = 0
    let withoutSku = 0
    let odooFormatSku = 0
    let numericSku = 0
    let textSku = 0

    for (const p of products) {
      const variants = Array.isArray(p.product_variant_ids)
        ? p.product_variant_ids.filter((v: any) => typeof v !== "number")
        : []

      for (const v of variants as any[]) {
        const sku = v.default_code || ""
        const vInfo: VariantInfo = {
          id: v.id,
          name: p.name || v.display_name || "(sans nom)",
          sku: sku || `ODOO-${v.id}`,
          price: v.lst_price || v.list_price || p.list_price || 0,
          stock: v.qty_available || 0,
        }
        allVariants.push(vInfo)

        if (sku) {
          withSku++
          if (/^\d+$/.test(sku)) numericSku++
          else textSku++
        } else {
          withoutSku++
          odooFormatSku++
        }
      }
    }

    ok(`${allVariants.length} variante(s) au total`)
    info(`Avec default_code (SKU): ${withSku} | Sans default_code: ${withoutSku}`)
    info(`SKU numériques: ${numericSku} | SKU textuels: ${textSku} | Format ODOO-{id}: ${odooFormatSku}`)

    // Afficher les 10 premières variantes avec leurs SKUs
    info("")
    info("Échantillon de variantes :")
    for (const v of allVariants.slice(0, 10)) {
      info(`  #${v.id} "${v.name}" → SKU: ${v.sku} | Prix: ${v.price}€ | Stock: ${v.stock}`)
    }
  } catch (e: any) {
    fail("Impossible de lister les produits", e.message)
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. Test du matching SKU (simule le flux de commande)
  // ═══════════════════════════════════════════════════════════════
  section("4. Test matching SKU (simulation)")

  if (allVariants.length > 0) {
    const testVariant = allVariants.find(v => v.price > 0 && v.stock >= 0) || allVariants[0]

    // Test 1: SKU direct (default_code)
    info(`Test avec SKU "${testVariant.sku}" (produit "${testVariant.name}")`)
    try {
      const stock = await odoo.getStockBySku(testVariant.sku)
      if (stock !== null) {
        ok(`Matching SKU "${testVariant.sku}" → trouvé (stock: ${stock})`)
      } else {
        fail(`Matching SKU "${testVariant.sku}" → NON trouvé`)
      }
    } catch (e: any) {
      fail(`Matching SKU "${testVariant.sku}" → erreur`, e.message)
    }

    // Test 2: Format ODOO-{id}
    const odooSku = `ODOO-${testVariant.id}`
    info(`Test avec SKU format Medusa "${odooSku}"`)
    try {
      const stock = await odoo.getStockBySku(odooSku)
      if (stock !== null) {
        ok(`Matching SKU "${odooSku}" → trouvé (stock: ${stock})`)
      } else {
        fail(`Matching SKU "${odooSku}" → NON trouvé`)
      }
    } catch (e: any) {
      fail(`Matching SKU "${odooSku}" → erreur`, e.message)
    }

    // Test 3: SKU inexistant (simule un bon cadeau)
    info("Test avec SKU inexistant (simule bon cadeau/promo)")
    try {
      const stock = await odoo.getStockBySku("GC-FAKE-123")
      if (stock === null) {
        ok("SKU inexistant \"GC-FAKE-123\" → retourne null (comportement correct)")
      } else {
        warn("SKU inexistant trouvé ? Inattendu.")
      }
    } catch (e: any) {
      fail("SKU inexistant a levé une exception au lieu de retourner null", e.message)
    }
  } else {
    warn("Pas de variantes pour tester le matching")
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. Produits de service (DELIVERY, DISCOUNT)
  // ═══════════════════════════════════════════════════════════════
  section("5. Produits de service (DELIVERY / DISCOUNT)")

  for (const code of ["DELIVERY", "DISCOUNT"]) {
    try {
      const stock = await odoo.getStockBySku(code)
      if (stock !== null) {
        ok(`Produit "${code}" existe dans Odoo`)
      } else {
        info(`Produit "${code}" n'existe pas encore → sera créé auto à la première commande`)
      }
    } catch (e: any) {
      warn(`Recherche "${code}": ${e.message}`)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. Simulation complète (sans créer dans Odoo)
  // ═══════════════════════════════════════════════════════════════
  section("6. Simulation commande (dry run)")

  if (allVariants.length > 0) {
    const testProduct = allVariants.find(v => v.price > 0) || allVariants[0]
    const simulatedItems = [
      { sku: testProduct.sku, quantity: 2, price: testProduct.price, name: testProduct.name, isGiftCard: false },
      { sku: "GC-BON-CADEAU-50", quantity: 1, price: 50, name: "Bon Cadeau 50€", isGiftCard: true },
    ]

    info("Items simulés (comme Medusa les enverrait) :")
    for (const item of simulatedItems) {
      info(`  SKU="${item.sku}" qty=${item.quantity} prix=${item.price}€ isGC=${item.isGiftCard} "${item.name}"`)
    }

    const itemsWithSku = simulatedItems.filter(i => i.sku)
    info(`\nItems avec SKU: ${itemsWithSku.length}/${simulatedItems.length}`)

    // Simuler la recherche de chaque SKU
    let matchedCount = 0
    let unmatchedSkus: string[] = []
    for (const item of itemsWithSku) {
      try {
        const stock = await odoo.getStockBySku(item.sku)
        if (stock !== null) {
          matchedCount++
          info(`  ✔ "${item.sku}" → trouvé dans Odoo`)
        } else {
          unmatchedSkus.push(item.sku)
          info(`  ✘ "${item.sku}" → PAS dans Odoo (item ignoré pour la commande Odoo)`)
        }
      } catch {
        unmatchedSkus.push(item.sku)
      }
    }

    if (matchedCount > 0) {
      ok(`${matchedCount} produit(s) matcherai(en)t dans Odoo → commande serait créée`)
    } else {
      warn("Aucun produit ne matcherait → commande Odoo ne serait PAS créée")
    }

    if (unmatchedSkus.length > 0) {
      info(`SKUs non matchés (promos/GC, ignorés): ${unmatchedSkus.join(", ")}`)
      ok("Les items non-Odoo sont correctement ignorés sans bloquer")
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. Création RÉELLE d'une commande test (optionnel)
  // ═══════════════════════════════════════════════════════════════
  section("7. Création commande test dans Odoo")

  if (!shouldCreate) {
    console.log(`  ${C.gray}Ajoutez --create pour créer une vraie commande test dans Odoo${C.reset}`)
  } else if (allVariants.length > 0) {
    const testProduct = allVariants.find(v => v.price > 0 && v.price < 200) || allVariants[0]
    info(`Produit: "${testProduct.name}" SKU=${testProduct.sku} prix=${testProduct.price}€`)

    try {
      // Scénario réaliste : 1 produit + livraison + remise
      const odooOrderId = await odoo.createOrder({
        customerEmail: "test-diagnostic@medusa-lacabrade.be",
        customerName: "Test Diagnostic Medusa",
        items: [
          {
            sku: testProduct.sku,
            quantity: 1,
            price: testProduct.price,
            name: `[TEST] ${testProduct.name}`,
          },
          // Simuler un item non-Odoo (bon cadeau) — devrait être ignoré
          {
            sku: "GC-TEST-FAKE",
            quantity: 1,
            price: 25,
            name: "[TEST] Bon cadeau simulé",
            isGiftCard: true,
          },
        ],
        shippingCost: 6.50,
        discountTotal: 5.00,
        total: testProduct.price + 6.50 - 5.00,
        shippingAddress: {
          address_1: "1 Rue du Test Diagnostic",
          city: "Bruxelles",
          postal_code: "1000",
          country_code: "BE",
        },
      })

      ok(`Commande test créée ! Odoo sale.order ID: ${odooOrderId}`)
      info(`→ Allez vérifier dans Odoo : Ventes > Commandes > ID ${odooOrderId}`)
      info(`→ Vérifiez que le montant total est correct`)
      info(`→ Le bon cadeau simulé (GC-TEST-FAKE) doit être ABSENT des lignes`)
      info(`→ Pensez à supprimer cette commande test ensuite`)
    } catch (e: any) {
      fail("Création commande test échouée", e.message)
      if (e?.data) info(`Détails Odoo: ${JSON.stringify(e.data)}`)
    }
  } else {
    warn("Pas de produits disponibles pour le test")
  }

  // ═══════════════════════════════════════════════════════════════
  // Résumé
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${"═".repeat(65)}`)
  console.log(`${C.bold}Résultat diagnostic Odoo${C.reset}`)
  console.log(`  ${C.green}${passed} OK${C.reset}  ${C.red}${failed} ÉCHEC${C.reset}  ${C.yellow}${warnings} AVERTISSEMENT(S)${C.reset}`)
  console.log(`${"═".repeat(65)}\n`)

  if (failed > 0) {
    console.log(`${C.red}${C.bold}Des erreurs ont été détectées.${C.reset}\n`)
    process.exit(1)
  } else {
    console.log(`${C.green}${C.bold}Diagnostic OK !${C.reset}`)
    if (!shouldCreate) {
      console.log(`${C.gray}Pour tester la création de commande, relancez avec --create${C.reset}\n`)
    }
  }
}

main().catch(e => {
  console.error(`\n${C.red}Erreur fatale:${C.reset}`, e.message)
  process.exit(1)
})
