#!/usr/bin/env node
/**
 * test-bpost-integration.js
 *
 * Script d'intégration Bpost — teste les endpoints réels du backend.
 * Nécessite un backend Medusa actif et un compte admin valide.
 *
 * Usage:
 *   node test-bpost-integration.js [backend_url] [email] [password] [order_id]
 *
 * Exemples:
 *   # Production Railway
 *   node test-bpost-integration.js \
 *     https://backend-production-7bbb.up.railway.app \
 *     welcome@mendly.io "0818Enchante!" \
 *     order_01JQ...
 *
 *   # Local
 *   node test-bpost-integration.js http://localhost:9000 admin@test.com password
 *
 * Tests effectués :
 *  1. Authentification admin (POST /auth/user/emailpass)
 *  2. Ping Bpost (GET /admin/bpost/status)
 *  3. Recherche points relais (GET /admin/bpost/shipping-options)
 *  4. [optionnel] Génération étiquette (POST /admin/bpost/shipments)
 *  5. [optionnel] Téléchargement étiquette PDF (GET /admin/bpost/download-label/:id)
 *  6. [optionnel] Renvoi email de suivi (POST /admin/bpost/shipments resend_only)
 */

const https = require("https")
const http = require("http")
const fs = require("fs")
const path = require("path")

// ─── Configuration ────────────────────────────────────────────────────────────

const BACKEND_URL = process.argv[2] || "https://backend-production-7bbb.up.railway.app"
const ADMIN_EMAIL = process.argv[3] || "welcome@mendly.io"
const ADMIN_PASSWORD = process.argv[4] || "0818Enchante!"
const TEST_ORDER_ID = process.argv[5] || null // optionnel

// ─── Couleurs console ─────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  blue: "\x1b[34m",
}

let passed = 0
let failed = 0
let skipped = 0

function ok(msg) { console.log(`  ${C.green}✔${C.reset} ${msg}`); passed++ }
function fail(msg, detail = "") {
  console.log(`  ${C.red}✘${C.reset} ${C.bold}${msg}${C.reset}`)
  if (detail) console.log(`    ${C.gray}→ ${detail}${C.reset}`)
  failed++
}
function skip(msg) { console.log(`  ${C.yellow}⊘${C.reset} ${C.gray}${msg} (skipped)${C.reset}`); skipped++ }
function section(title) { console.log(`\n${C.cyan}${C.bold}── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}${C.reset}`) }
function info(msg) { console.log(`  ${C.blue}ℹ${C.reset} ${C.gray}${msg}${C.reset}`) }

// ─── Utilitaire fetch ─────────────────────────────────────────────────────────

async function apiFetch(path, { method = "GET", body, token, binary = false } = {}) {
  const url = new URL(path, BACKEND_URL)
  const isHttps = url.protocol === "https:"
  const lib = isHttps ? https : http

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      rejectUnauthorized: false, // pour les certs auto-signés en dev
    }

    const jsonBody = body ? JSON.stringify(body) : null
    if (jsonBody) options.headers["Content-Length"] = Buffer.byteLength(jsonBody)

    const req = lib.request(options, (res) => {
      const chunks = []
      res.on("data", (chunk) => chunks.push(chunk))
      res.on("end", () => {
        const rawBuffer = Buffer.concat(chunks)
        if (binary) {
          resolve({ status: res.statusCode, headers: res.headers, buffer: rawBuffer })
          return
        }
        const text = rawBuffer.toString("utf8")
        let json = null
        try { json = JSON.parse(text) } catch {}
        resolve({ status: res.statusCode, headers: res.headers, text, json })
      })
    })

    req.on("error", reject)
    if (jsonBody) req.write(jsonBody)
    req.end()
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log(`\n${C.bold}Bpost Integration Tests${C.reset}`)
  console.log(`${C.gray}Backend : ${BACKEND_URL}${C.reset}`)
  console.log(`${C.gray}Heure   : ${new Date().toLocaleString("fr-BE")}${C.reset}`)

  let token = null
  let testOrderId = TEST_ORDER_ID

  // ══════════════════════════════════════════════════════════════════════
  // 1. Authentification Admin
  // ══════════════════════════════════════════════════════════════════════

  section("1. Authentification Admin")

  try {
    const authRes = await apiFetch("/auth/user/emailpass", {
      method: "POST",
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })

    if (authRes.status === 200 && authRes.json?.token) {
      token = authRes.json.token
      ok(`Authentifié en tant que ${ADMIN_EMAIL}`)
      info(`Token reçu (${token.length} chars)`)
    } else {
      fail("Authentification échouée", `HTTP ${authRes.status} — ${authRes.text?.slice(0, 200)}`)
    }
  } catch (e) {
    fail("Erreur réseau lors de l'authentification", e.message)
  }

  if (!token) {
    console.log(`\n${C.red}${C.bold}Impossible de continuer sans token d'authentification.${C.reset}\n`)
    process.exit(1)
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. Ping Bpost (statut connexion)
  // ══════════════════════════════════════════════════════════════════════

  section("2. Connexion Bpost (ping)")

  try {
    const pingRes = await apiFetch("/admin/bpost/status", { token })

    if (pingRes.status === 200) {
      const isOk = pingRes.json?.status === "ok" || pingRes.json?.connected === true || pingRes.json?.ok === true
      if (isOk) {
        ok("API Bpost accessible (status: ok)")
      } else {
        fail("API Bpost non accessible", JSON.stringify(pingRes.json))
      }
      info(`Réponse: ${JSON.stringify(pingRes.json).slice(0, 200)}`)
    } else {
      fail(`Status inattendu: ${pingRes.status}`, pingRes.text?.slice(0, 200))
    }
  } catch (e) {
    fail("Erreur réseau ping Bpost", e.message)
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. Options de livraison Bpost
  // ══════════════════════════════════════════════════════════════════════

  section("3. Options de livraison Bpost")

  try {
    const optRes = await apiFetch("/admin/bpost/shipping-options", { token })

    if (optRes.status === 200) {
      const options = optRes.json?.shipping_options || optRes.json?.options || optRes.json
      const count = Array.isArray(options) ? options.length : "?"
      ok(`${count} option(s) de livraison trouvée(s)`)
      if (Array.isArray(options)) {
        options.slice(0, 3).forEach((o) => info(`  • ${o.name || o.id} — ${((o.amount || 0) / 100).toFixed(2)}€`))
      }
    } else {
      fail(`Status inattendu: ${optRes.status}`, optRes.text?.slice(0, 200))
    }
  } catch (e) {
    fail("Erreur réseau shipping-options", e.message)
  }

  // ══════════════════════════════════════════════════════════════════════
  // 4. Récupération d'une commande Bpost (si order_id fourni)
  // ══════════════════════════════════════════════════════════════════════

  section("4. Commande de test")

  if (!testOrderId) {
    // Chercher la dernière commande avec livraison Bpost
    try {
      const ordersRes = await apiFetch("/admin/orders?limit=20&fields=id,display_id,email,metadata,shipping_methods", { token })
      if (ordersRes.status === 200) {
        const orders = ordersRes.json?.orders || []
        const bpostOrder = orders.find((o) =>
          o.metadata?.bpost_pickup_point ||
          o.metadata?.bpost_shipment_id ||
          (o.shipping_methods || []).some((m) =>
            (m.name || "").toLowerCase().includes("bpost")
          )
        )
        if (bpostOrder) {
          testOrderId = bpostOrder.id
          ok(`Commande Bpost trouvée automatiquement: #${bpostOrder.display_id} (${bpostOrder.id})`)
          info(`Email: ${bpostOrder.email}`)
        } else {
          skip("Aucune commande Bpost trouvée parmi les 20 dernières — passez un order_id en argument")
        }
      }
    } catch (e) {
      skip(`Impossible de chercher les commandes: ${e.message}`)
    }
  } else {
    try {
      const orderRes = await apiFetch(`/admin/orders/${testOrderId}?fields=id,display_id,email,metadata`, { token })
      if (orderRes.status === 200) {
        const o = orderRes.json?.order || orderRes.json
        ok(`Commande chargée: #${o.display_id || o.id}`)
        info(`Email: ${o.email} | Metadata Bpost: ${JSON.stringify(o.metadata?.bpost_shipment_id || "(aucun)")}`)
      } else {
        fail(`Commande ${testOrderId} introuvable`, `HTTP ${orderRes.status}`)
        testOrderId = null
      }
    } catch (e) {
      fail("Erreur chargement commande", e.message)
      testOrderId = null
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 5. Génération d'une étiquette Bpost
  // ══════════════════════════════════════════════════════════════════════

  section("5. Génération étiquette Bpost")

  let generatedTracking = null
  let generatedLabelUrl = null

  if (!testOrderId) {
    skip("Order ID requis pour tester la génération d'étiquette")
  } else {
    try {
      console.log(`  ${C.gray}→ POST /admin/bpost/shipments { order_id: ${testOrderId}, send_email: false }${C.reset}`)
      const shipRes = await apiFetch("/admin/bpost/shipments", {
        method: "POST",
        token,
        body: {
          order_id: testOrderId,
          send_email: false, // Ne pas envoyer d'email pendant les tests
        },
      })

      if (shipRes.status === 200 && shipRes.json?.success) {
        generatedTracking = shipRes.json.tracking_number
        generatedLabelUrl = shipRes.json.shipment?.labelUrl

        ok(`Shipment créé avec succès`)
        if (generatedTracking) {
          ok(`Numéro de suivi reçu: ${generatedTracking}`)
          info(`URL suivi: https://track.bpost.cloud/btr/web/#/search?itemCode=${generatedTracking}&lang=fr`)
        } else {
          fail("Aucun numéro de suivi dans la réponse", JSON.stringify(shipRes.json).slice(0, 300))
        }

        if (generatedLabelUrl) {
          ok(`URL d'étiquette reçue (${generatedLabelUrl.substring(0, 60)}...)`)
        } else {
          fail("Aucune URL d'étiquette retournée", JSON.stringify(shipRes.json).slice(0, 300))
        }

        info(`email_sent: ${shipRes.json.email_sent}`)
      } else {
        fail(
          `Génération échouée (HTTP ${shipRes.status})`,
          shipRes.json?.message || shipRes.text?.slice(0, 300)
        )
      }
    } catch (e) {
      fail("Erreur réseau génération étiquette", e.message)
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 6. Téléchargement de l'étiquette PDF via notre proxy
  // ══════════════════════════════════════════════════════════════════════

  section("6. Téléchargement PDF via proxy")

  if (!testOrderId) {
    skip("Order ID requis pour tester le téléchargement")
  } else {
    try {
      const dlRes = await apiFetch(`/admin/bpost/download-label/${testOrderId}`, {
        token,
        binary: true,
      })

      if (dlRes.status === 200) {
        const contentType = dlRes.headers["content-type"] || ""
        const contentDisp = dlRes.headers["content-disposition"] || ""
        const bufLen = dlRes.buffer?.length || 0

        if (contentType.includes("application/pdf")) {
          ok(`Content-Type: application/pdf ✔`)
        } else if (dlRes.status === 302) {
          ok(`Redirect 302 vers l'URL Bpost (label URL externe)`)
        } else {
          fail(`Content-Type inattendu: ${contentType}`)
        }

        if (contentDisp.includes("attachment")) {
          ok(`Content-Disposition: attachment ✔`)
        } else {
          fail(`Content-Disposition manquant: "${contentDisp}"`)
        }

        if (bufLen > 100) {
          ok(`Taille PDF: ${bufLen} bytes`)
          // Sauvegarder pour vérification manuelle
          const outPath = path.join(__dirname, `test-label-${testOrderId.slice(-8)}.pdf`)
          fs.writeFileSync(outPath, dlRes.buffer)
          info(`PDF sauvegardé → ${outPath}`)
        } else {
          fail(`PDF trop petit (${bufLen} bytes) — données invalides ?`)
        }
      } else if (dlRes.status === 302) {
        ok(`Redirect 302 vers URL Bpost directe`)
        info(`Location: ${dlRes.headers.location}`)
      } else if (dlRes.status === 404) {
        fail("404 — aucune étiquette trouvée pour cette commande", dlRes.buffer?.toString("utf8").slice(0, 200))
      } else {
        fail(`Status inattendu: ${dlRes.status}`, dlRes.buffer?.toString("utf8").slice(0, 200))
      }
    } catch (e) {
      fail("Erreur réseau téléchargement PDF", e.message)
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 7. Renvoi de l'email de suivi (resend_only)
  // ══════════════════════════════════════════════════════════════════════

  section("7. Renvoi email de suivi (resend_only)")

  if (!testOrderId || !generatedTracking) {
    skip("Tracking number requis pour tester le renvoi d'email")
  } else {
    try {
      console.log(`  ${C.gray}→ POST /admin/bpost/shipments { resend_only: true }${C.reset}`)
      const resendRes = await apiFetch("/admin/bpost/shipments", {
        method: "POST",
        token,
        body: { order_id: testOrderId, resend_only: true },
      })

      if (resendRes.status === 200 && resendRes.json?.success) {
        if (resendRes.json.email_sent) {
          ok(`Email de suivi renvoyé avec succès (tracking: ${resendRes.json.tracking_number})`)
        } else {
          fail("email_sent=false — le service de notification a échoué", JSON.stringify(resendRes.json))
        }
      } else {
        fail(`Renvoi échoué (HTTP ${resendRes.status})`, resendRes.json?.message || resendRes.text?.slice(0, 200))
      }
    } catch (e) {
      fail("Erreur réseau renvoi email", e.message)
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 8. Résumé
  // ══════════════════════════════════════════════════════════════════════

  const total = passed + failed + skipped
  console.log(`\n${"═".repeat(65)}`)
  console.log(`${C.bold}Résultats${C.reset}`)
  console.log(`  ${C.green}${passed} réussi(s)${C.reset}  ${C.red}${failed} échoué(s)${C.reset}  ${C.yellow}${skipped} ignoré(s)${C.reset}  (total: ${total})`)
  console.log(`${"═".repeat(65)}\n`)

  if (failed > 0) process.exit(1)
}

runTests().catch((e) => {
  console.error(`\n${C.red}Erreur fatale:${C.reset}`, e.message)
  process.exit(1)
})
