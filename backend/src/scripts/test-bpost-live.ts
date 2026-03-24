/**
 * Script d'intégration Bpost LIVE — teste toute la chaîne contre l'API réelle.
 * Usage : cd backend && npx tsx src/scripts/test-bpost-live.ts
 *
 * Variables d'environnement requises :
 *   BPOST_PUBLIC_KEY   clé publique du contrat
 *   BPOST_PRIVATE_KEY  clé privée du contrat
 *   (optionnel) BPOST_APP_KEY, BPOST_SHOP_URL
 */

import BpostModuleService from "../modules/bpost/service"

// ─── Config ───────────────────────────────────────────────────────────────────

const PUBLIC_KEY = process.env.BPOST_PUBLIC_KEY || ""
const PRIVATE_KEY = process.env.BPOST_PRIVATE_KEY || ""

if (!PUBLIC_KEY || !PRIVATE_KEY) {
  console.error("❌ Variables manquantes : BPOST_PUBLIC_KEY et BPOST_PRIVATE_KEY requis")
  console.error("   export BPOST_PUBLIC_KEY=xxx BPOST_PRIVATE_KEY=yyy")
  process.exit(1)
}

const svc = new BpostModuleService({} as any, {
  publicKey: PUBLIC_KEY,
  privateKey: PRIVATE_KEY,
})

// Référence unique pour ce test (évite les doublons en cas de relance)
const TEST_REF = `TEST-MEDUSA-${Date.now()}`

// Adresse de test réelle (La Cabrade fictif)
const RECIPIENT = {
  name: "Test La Cabrade",
  email: "contact@sellerie-lacabrade.be",
  phone: "+32 475 00 00 00",
  address: {
    address_1: "Rue de la Sellerie 1",
    postal_code: "1000",
    city: "Bruxelles",
    country_code: "BE",
  },
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
const issues: string[] = []

function ok(label: string, detail = "") {
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`)
  passed++
}

function fail(label: string, detail = "") {
  console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`)
  failed++
  issues.push(`${label}: ${detail}`)
}

function step(title: string) {
  console.log(`\n${"═".repeat(60)}`)
  console.log(`  ${title}`)
  console.log("═".repeat(60))
}

// ─── Exécution principale ─────────────────────────────────────────────────────

async function main() {

// ─── ÉTAPE 1 : Token / Auth ───────────────────────────────────────────────────

step("1. Authentification (token /keys)")
try {
  const token = await (svc as any).ensureToken()
  if (token && token.length > 10) {
    ok("Token obtenu", `${token.slice(0, 20)}...`)
  } else {
    fail("Token invalide ou vide", String(token))
  }
} catch (e: any) {
  fail("ensureToken()", e.message)
  console.error("   → Impossible de continuer sans token. Vérifiez BPOST_PUBLIC_KEY / PRIVATE_KEY.")
  process.exit(1)
}

// ─── ÉTAPE 2 : Carriers ───────────────────────────────────────────────────────

step("2. Carriers disponibles")
try {
  const carriers = await svc.getCarriers()
  const list = Array.isArray(carriers?.Carrier) ? carriers.Carrier
    : Array.isArray(carriers) ? carriers : []

  if (list.length > 0) {
    ok(`${list.length} carrier(s) trouvé(s)`, list.map((c: any) => `${c.Name || c.name} (id=${c.Id || c.id})`).join(", "))
  } else {
    fail("Aucun carrier renvoyé", JSON.stringify(carriers).slice(0, 200))
  }
} catch (e: any) {
  fail("getCarriers()", e.message)
}

// ─── ÉTAPE 3 : Points relais ──────────────────────────────────────────────────

step("3. Points relais (code postal 1000 Bruxelles)")
try {
  const result = await svc.listPickupPoints({
    postalCode: "1000",
    country: "BE",
    city: "Bruxelles",
    street: "Rue de la Loi",
  })

  if (result.points && result.points.length > 0) {
    ok(`${result.points.length} point(s) relais trouvé(s)`,
      result.points.slice(0, 2).map((p: any) =>
        `${p.Name || p.name || p.Id || "?"} (${p.PostalCode || p.postalCode || ""})`
      ).join(", ")
    )
  } else if (result.error) {
    fail("Points relais", result.error)
  } else {
    fail("Aucun point relais renvoyé", "Vérifiez le contrat")
  }
} catch (e: any) {
  fail("listPickupPoints()", e.message)
}

// ─── ÉTAPE 4 : Création de shipment ──────────────────────────────────────────

step(`4. Création shipment (ref: ${TEST_REF})`)
let createdRef = ""
let trackingNumber = ""
try {
  const result = await svc.createShipment({
    orderId: TEST_REF,
    recipient: RECIPIENT,
    weightGrams: 500,
  })

  createdRef = result.clientReference || result.shipmentId || ""
  trackingNumber = result.trackingNumber || ""

  if (createdRef) {
    ok(`Shipment créé`, `ref=${createdRef}, tracking=${trackingNumber || "(à venir)"}`)
  } else {
    fail("Shipment créé sans référence", JSON.stringify(result))
  }

  if (result.labelUrl) {
    ok("Label inline obtenu à la création", `${result.labelUrl.length} chars`)
  } else {
    console.log("  ℹ️  Pas de label inline (normal — sera récupéré à l'étape suivante)")
  }
} catch (e: any) {
  fail("createShipment()", e.message)
  console.error("   → Réponse complète dans les logs ci-dessus")
  createdRef = TEST_REF // Tenter quand même getLabel avec la ref
}

// ─── ÉTAPE 5 : Génération d'étiquette ────────────────────────────────────────

step(`5. Génération étiquette (ref: ${createdRef || TEST_REF})`)
const labelRef = createdRef || TEST_REF
try {
  const { labelUrl, labelData, trackingNumber: trackingFromLabel } = await svc.getLabel(labelRef, labelRef)

  if (labelData && labelData.length > 100) {
    ok(`PDF obtenu (base64)`, `${labelData.length} chars`)
    const decoded = Buffer.from(labelData, "base64")
    if (decoded.subarray(0, 5).toString("utf-8") === "%PDF-") {
      ok("Magic bytes %PDF- vérifiés", `${decoded.length} bytes`)
      // Sauvegarder le PDF pour inspection visuelle
      const { writeFileSync } = await import("fs")
      const pdfPath = `/tmp/bpost-label-test.pdf`
      writeFileSync(pdfPath, decoded)
      console.log(`  📄 PDF sauvegardé : ${pdfPath} → ouvrez-le pour voir si un barcode est présent`)
    } else {
      fail("Le labelData n'est pas un PDF valide", decoded.subarray(0, 20).toString("utf-8"))
    }
    if (trackingFromLabel) {
      ok("TrackingId extrait du label", trackingFromLabel)
    } else {
      console.log("  ⚠️  TrackingId absent dans la réponse JSON")
    }
  } else if (labelUrl && labelUrl.startsWith("http")) {
    ok("URL étiquette obtenue", labelUrl.slice(0, 80) + "...")
    console.log("  ℹ️  C'est une URL externe — le téléchargement fonctionnera via le backend")
  } else if (labelUrl && labelUrl.startsWith("data:application/pdf")) {
    ok("Label data URI obtenu", `${labelUrl.length} chars`)
  } else {
    fail("Aucune étiquette obtenue", "Voir logs ci-dessus pour la réponse Bpost complète")
    console.log("  ℹ️  Vérifications :")
    console.log("     • Le shipment a-t-il bien été créé à l'étape 4 ?")
    console.log("     • La ClientReference est-elle reconnue par Bpost ?")
    console.log("     • Votre contrat autorise-t-il la génération d'étiquettes ?")
  }
} catch (e: any) {
  fail("getLabel()", e.message)
}

// ─── RÉSULTAT ─────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`)
console.log(`  RÉSULTAT: ${passed} ✅  ${failed} ❌`)
if (issues.length > 0) {
  console.log(`\n  Problèmes :`)
  issues.forEach(i => console.log(`    • ${i}`))
}
console.log("═".repeat(60))

if (failed > 0) process.exit(1)

} // fin main()

main().catch(e => { console.error("Erreur fatale:", e); process.exit(1) })
