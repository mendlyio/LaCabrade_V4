/**
 * Script pour ajouter tous les pays de la zone Euro à la région existante
 * 
 * Usage: npx medusa exec src/scripts/add-eurozone-countries.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// Tous les pays de la zone Euro (20 pays)
const EUROZONE_COUNTRIES = [
  "at", // Autriche
  "be", // Belgique
  "cy", // Chypre
  "de", // Allemagne
  "ee", // Estonie
  "es", // Espagne
  "fi", // Finlande
  "fr", // France
  "gr", // Grèce
  "hr", // Croatie
  "ie", // Irlande
  "it", // Italie
  "lt", // Lituanie
  "lu", // Luxembourg
  "lv", // Lettonie
  "mt", // Malte
  "nl", // Pays-Bas
  "pt", // Portugal
  "si", // Slovénie
  "sk", // Slovaquie
]

const COUNTRY_NAMES: Record<string, string> = {
  at: "Autriche",
  be: "Belgique",
  cy: "Chypre",
  de: "Allemagne",
  ee: "Estonie",
  es: "Espagne",
  fi: "Finlande",
  fr: "France",
  gr: "Grèce",
  hr: "Croatie",
  ie: "Irlande",
  it: "Italie",
  lt: "Lituanie",
  lu: "Luxembourg",
  lv: "Lettonie",
  mt: "Malte",
  nl: "Pays-Bas",
  pt: "Portugal",
  si: "Slovénie",
  sk: "Slovaquie",
}

export default async function addEurozoneCountries({ container }: ExecArgs) {
  const regionService = container.resolve(Modules.REGION)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  console.log("\n🇪🇺 Ajout des pays de la zone Euro...\n")

  try {
    // 1. Récupérer toutes les régions
    const regions = await regionService.listRegions({})
    
    if (!regions || regions.length === 0) {
      console.error("❌ Aucune région trouvée")
      return
    }

    // Utiliser la première région (Belgique)
    const region = regions[0]
    console.log(`📍 Région actuelle: ${region.name} (${region.currency_code.toUpperCase()})`)
    console.log(`   ID: ${region.id}`)

    // 2. Récupérer les pays actuels
    const currentCountries = await regionService.listRegionCountries({ region_id: region.id })
    const currentCountryCodes = currentCountries.map((c: any) => c.iso_2.toLowerCase())
    
    console.log(`\n📋 Pays actuels (${currentCountries.length}):`)
    currentCountries.forEach((c: any) => {
      console.log(`   ✓ ${c.iso_2.toUpperCase()} - ${c.display_name || c.name || COUNTRY_NAMES[c.iso_2.toLowerCase()]}`)
    })

    // 3. Trouver les pays manquants
    const missingCountries = EUROZONE_COUNTRIES.filter(
      code => !currentCountryCodes.includes(code)
    )

    if (missingCountries.length === 0) {
      console.log("\n✅ Tous les pays de la zone Euro sont déjà configurés !")
      return
    }

    console.log(`\n➕ Pays à ajouter (${missingCountries.length}):`)
    missingCountries.forEach(code => {
      console.log(`   + ${code.toUpperCase()} - ${COUNTRY_NAMES[code]}`)
    })

    // 4. Ajouter les pays manquants
    console.log("\n🔄 Ajout en cours...")
    
    for (const countryCode of missingCountries) {
      try {
        await regionService.addRegionCountries({
          region_id: region.id,
          countries: [countryCode],
        })
        console.log(`   ✓ ${countryCode.toUpperCase()} - ${COUNTRY_NAMES[countryCode]} ajouté`)
      } catch (error: any) {
        console.error(`   ✗ ${countryCode.toUpperCase()} - Erreur: ${error.message}`)
      }
    }

    // 5. Mettre à jour la zone de livraison "Europe"
    console.log("\n🚚 Mise à jour de la zone de livraison internationale...")
    
    const allServiceZones = await fulfillmentModuleService.listServiceZones({})
    const europeZone = allServiceZones.find((z: any) => 
      z.name?.toLowerCase().includes("international") || 
      z.name?.toLowerCase().includes("europe")
    )

    if (europeZone) {
      // Tous les pays Euro sauf BE (qui a sa propre zone)
      const internationalCountries = EUROZONE_COUNTRIES.filter(c => c !== "be")
      
      try {
        await fulfillmentModuleService.updateServiceZones([{
          selector: { id: europeZone.id },
          update: {
            geo_zones: internationalCountries.map(code => ({
              country_code: code,
              type: "country" as const,
            })),
          },
        }])
        console.log(`   ✓ Zone "${europeZone.name}" mise à jour avec ${internationalCountries.length} pays`)
      } catch (error: any) {
        console.warn(`   ⚠️ Impossible de mettre à jour la zone: ${error.message}`)
      }
    } else {
      console.warn("   ⚠️ Zone internationale non trouvée")
    }

    // 6. Vérification finale
    console.log("\n✅ Configuration terminée !")
    console.log("\n📊 Résumé:")
    console.log(`   • Région: ${region.name}`)
    console.log(`   • Devise: ${region.currency_code.toUpperCase()}`)
    console.log(`   • Pays configurés: ${EUROZONE_COUNTRIES.length}`)
    console.log(`   • Pays ajoutés: ${missingCountries.length}`)
    
    console.log("\n🎯 Les clients peuvent maintenant choisir tous les pays de la zone Euro !")
    console.log("\n📦 Pays disponibles:")
    EUROZONE_COUNTRIES.forEach(code => {
      console.log(`   🇪🇺 ${code.toUpperCase()} - ${COUNTRY_NAMES[code]}`)
    })
    console.log()

  } catch (error: any) {
    console.error("\n❌ Erreur:", error.message)
    throw error
  }
}

