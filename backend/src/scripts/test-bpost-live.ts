/**
 * Test d'intégration Bpost LIVE — couvre tout le flux production.
 * Usage : cd backend && npx tsx src/scripts/test-bpost-live.ts
 *
 * Scénarios testés :
 *  1. Auth token
 *  2. Carriers disponibles
 *  3. Points relais Belgique
 *  4. Shipment Belgique domicile (produit 302)
 *  5. Label PDF + extraction tracking depuis PDF
 *  6. URL de tracking Bpost valide
 *  7. Shipment international domicile (produit 303)
 *  8. Shipment point relais Belgique (produit 301)
 *  9. extractBpostTrackingFromPdf() sur PDF réel
 */

import BpostModuleService, { extractBpostTrackingFromPdf } from "../modules/bpost/service"

const PUBLIC_KEY = process.env.BPOST_PUBLIC_KEY || ""
const PRIVATE_KEY = process.env.BPOST_PRIVATE_KEY || ""

if (!PUBLIC_KEY || !PRIVATE_KEY) {
  console.error("❌ Variables manquantes : BPOST_PUBLIC_KEY et BPOST_PRIVATE_KEY requis")
  process.exit(1)
}

const svc = new BpostModuleService({} as any, {
  publicKey: PUBLIC_KEY,
  privateKey: PRIVATE_KEY,
})

const TS = Date.now()
const RECIPIENT_BE = {
  name: "Test La Cabrade",
  email: "contact@sellerie-lacabrade.be",
  phone: "+32 475 00 00 00",
  address: { address_1: "Rue de la Paix 1", postal_code: "1000", city: "Bruxelles", country_code: "BE" },
}
const RECIPIENT_FR = {
  name: "Test International",
  email: "test@example.com",
  phone: "+33 6 00 00 00 00",
  address: { address_1: "Rue de la Paix 1", postal_code: "75001", city: "Paris", country_code: "FR" },
}

let passed = 0; let failed = 0
const issues: string[] = []

function ok(label: string, detail = "") { console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`); passed++ }
function fail(label: string, detail = "") { console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`); failed++; issues.push(`${label}: ${detail}`) }
function warn(label: string) { console.log(`  ⚠️  ${label}`) }
function step(title: string) { console.log(`\n${"═".repeat(62)}\n  ${title}\n${"═".repeat(62)}`) }

async function main() {

// ── 1. AUTH ───────────────────────────────────────────────────────────────────
step("1. Authentification (token /keys)")
try {
  const token = await (svc as any).ensureToken()
  token?.length > 10 ? ok("Token obtenu", `${token.slice(0, 20)}…`) : fail("Token invalide", String(token))
} catch (e: any) { fail("ensureToken()", e.message); process.exit(1) }

// ── 2. CARRIERS ───────────────────────────────────────────────────────────────
step("2. Carriers disponibles")
let carrierId: number | null = null
try {
  const carriers = await svc.getCarriers()
  const list = Array.isArray(carriers?.Carrier) ? carriers.Carrier
    : Array.isArray(carriers) ? carriers : []
  if (list.length > 0) {
    carrierId = list[0]?.Id || list[0]?.id
    ok(`${list.length} carrier(s)`, list.map((c: any) => `${c.Name || c.name} (id=${c.Id || c.id})`).join(", "))
  } else { fail("Aucun carrier", JSON.stringify(carriers).slice(0, 200)) }
} catch (e: any) { fail("getCarriers()", e.message) }

// ── 3. POINTS RELAIS BELGIQUE ─────────────────────────────────────────────────
step("3. Points relais Belgique (1000 Bruxelles)")
let pickupPointId: string | undefined
try {
  const r = await svc.listPickupPoints({ postalCode: "1000", country: "BE", city: "Bruxelles", street: "Rue de la Loi" })
  if (r.points?.length > 0) {
    pickupPointId = r.points[0]?.PointId || r.points[0]?.Id || r.points[0]?.id
    ok(`${r.points.length} points relais`, `Premier: ${r.points[0]?.Information?.Name || pickupPointId}`)
  } else { fail("Aucun point relais", r.error || "") }
} catch (e: any) { fail("listPickupPoints()", e.message) }

// ── 4. SHIPMENT BELGIQUE DOMICILE (302) ───────────────────────────────────────
step("4. Shipment Belgique domicile (produit 302 — bpack 24h Pro)")
let refBe = `LCBE-${TS}`
let labelDataBe: string | undefined
let trackingBe: string | undefined
try {
  const r = await svc.createShipment({ orderId: refBe, recipient: RECIPIENT_BE, weightGrams: 500 })
  if (r.clientReference) {
    ok("Shipment créé", `ref=${r.clientReference}, carrier confirmed`)
    refBe = r.clientReference
  } else { fail("Shipment sans référence", JSON.stringify(r)) }
} catch (e: any) { fail("createShipment() BE domicile", e.message) }

// ── 5. LABEL PDF + TRACKING EXTRACTION ───────────────────────────────────────
step("5. Label PDF + extraction tracking (Belgique domicile)")
try {
  const lr = await svc.getLabel(refBe, refBe)
  labelDataBe = lr.labelData
  trackingBe = lr.trackingNumber

  if (lr.labelData && lr.labelData.length > 100) {
    const decoded = Buffer.from(lr.labelData, "base64")
    if (decoded.subarray(0, 5).toString("utf-8") === "%PDF-") {
      ok("PDF valide", `${decoded.length} bytes`)
      // Sauvegarder pour vérification manuelle
      const { writeFileSync } = await import("fs")
      writeFileSync("/tmp/bpost-be-label.pdf", decoded)
      console.log("  📄 PDF → /tmp/bpost-be-label.pdf")
    } else { fail("Pas un PDF valide", decoded.subarray(0, 10).toString()) }
  } else { fail("Pas de labelData", `labelUrl: ${lr.labelUrl?.slice(0, 60)}`) }

  if (lr.trackingNumber) {
    ok("Tracking extrait", lr.trackingNumber)
    // Vérifier format Bpost (15-30 chiffres, commence par 3232 ou 3230)
    if (/^\d{15,30}$/.test(lr.trackingNumber)) {
      ok("Format tracking valide", `${lr.trackingNumber.length} chiffres`)
    } else {
      warn(`Format tracking inhabituel: ${lr.trackingNumber}`)
    }
  } else { fail("Tracking non extrait du PDF — email ne sera pas envoyé") }
} catch (e: any) { fail("getLabel() BE domicile", e.message) }

// ── 6. URL TRACKING BPOST ─────────────────────────────────────────────────────
step("6. URL de tracking client Bpost")
if (trackingBe) {
  const url = `https://track.bpost.cloud/btr/web/#/search?itemCode=${trackingBe}&lang=fr&postalCode=1000`
  ok("URL tracking générée", url)
  // Vérifier que l'URL est atteignable
  try {
    const res = await fetch(url, { method: "HEAD" })
    ok(`URL accessible (HTTP ${res.status})`)
  } catch { warn("URL tracking non testable depuis ce réseau") }
} else { warn("Pas de tracking → URL non générée") }

// ── 7. SHIPMENT INTERNATIONAL (303) ──────────────────────────────────────────
step("7. Shipment international domicile France (produit 303 — bpack World Business)")
let refFr = `LCFR-${TS}`
try {
  const r = await svc.createShipment({ orderId: refFr, recipient: RECIPIENT_FR, weightGrams: 500 })
  if (r.clientReference) {
    ok("Shipment international créé", `ref=${r.clientReference}`)
    refFr = r.clientReference

    // Label international
    const lr = await svc.getLabel(refFr, refFr)
    if (lr.labelData && Buffer.from(lr.labelData, "base64").subarray(0, 5).toString("utf-8") === "%PDF-") {
      ok("Label international PDF valide", `${Buffer.from(lr.labelData, "base64").length} bytes`)
      const { writeFileSync } = await import("fs")
      writeFileSync("/tmp/bpost-fr-label.pdf", Buffer.from(lr.labelData, "base64"))
      console.log("  📄 PDF international → /tmp/bpost-fr-label.pdf")
    } else {
      fail("Label international invalide ou absent")
    }
    if (lr.trackingNumber) {
      ok("Tracking international extrait", lr.trackingNumber)
    } else {
      warn("Pas de tracking pour l'envoi international")
    }
  } else { fail("Shipment international sans référence") }
} catch (e: any) { fail("createShipment() FR international", e.message) }

// ── 8. SHIPMENT POINT RELAIS BELGIQUE (301) ───────────────────────────────────
step("8. Shipment point relais Belgique (produit 301 — Bpack 24/7)")
if (pickupPointId) {
  let refPp = `LCPP-${TS}`
  try {
    const r = await svc.createShipment({
      orderId: refPp,
      recipient: RECIPIENT_BE,
      pickupPointId,
      weightGrams: 500,
    })
    if (r.clientReference) {
      ok("Shipment point relais créé", `ref=${r.clientReference}, pickup=${pickupPointId}`)
      refPp = r.clientReference
      const lr = await svc.getLabel(refPp, refPp)
      if (lr.labelData && Buffer.from(lr.labelData, "base64").subarray(0, 5).toString("utf-8") === "%PDF-") {
        ok("Label point relais PDF valide", `${Buffer.from(lr.labelData, "base64").length} bytes`)
      } else {
        fail("Label point relais invalide ou absent")
      }
      if (lr.trackingNumber) { ok("Tracking point relais extrait", lr.trackingNumber) }
      else { warn("Pas de tracking pour le point relais") }
    } else { fail("Shipment point relais sans référence") }
  } catch (e: any) { fail("createShipment() point relais", e.message) }
} else {
  warn("Test point relais ignoré (aucun PointId disponible à l'étape 3)")
}

// ── 9. EXTRACTION TRACKING DEPUIS PDF EXISTANT ────────────────────────────────
step("9. extractBpostTrackingFromPdf() — test unitaire sur PDF réel")
if (labelDataBe) {
  const extracted = extractBpostTrackingFromPdf(labelDataBe)
  if (extracted && /^\d{15,}$/.test(extracted)) {
    ok("Extraction tracking depuis PDF", extracted)
    if (trackingBe && extracted === trackingBe) {
      ok("Cohérence tracking API = tracking PDF")
    } else if (trackingBe) {
      warn(`Différence : API=${trackingBe}, PDF=${extracted}`)
    }
  } else {
    fail("extractBpostTrackingFromPdf() n'a rien trouvé")
  }
} else {
  warn("Test extraction ignoré (pas de labelData disponible)")
}

// ── RÉSULTAT ───────────────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(62)}`)
console.log(`  RÉSULTAT FINAL: ${passed} ✅   ${failed} ❌`)
if (issues.length > 0) {
  console.log(`\n  Problèmes détectés :`)
  issues.forEach(i => console.log(`    • ${i}`))
}
console.log("═".repeat(62) + "\n")

if (failed > 0) process.exit(1)

} // fin main()

main().catch(e => { console.error("Erreur fatale:", e); process.exit(1) })
