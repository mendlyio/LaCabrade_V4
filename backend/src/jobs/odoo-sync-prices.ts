import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../modules/odoo"
import OdooModuleService from "../modules/odoo/service"

/**
 * Job planifié : Réconciliation des prix Odoo → Medusa (1× par heure)
 *
 * Détecte les variantes Medusa importées d'Odoo qui n'ont AUCUN price_set
 * associé (et donc affichent "Sur demande" sur le storefront), puis crée
 * le price_set + price manquants depuis le list_price/lst_price Odoo.
 *
 * Pourquoi ce job : le workflow d'import (sync-from-erp) peut, dans certains
 * cas (typiquement nouvelle variante ajoutée à un produit existant), créer
 * une variante sans déclencher la création du price_set. Plutôt que de
 * traquer chaque cas, ce job réconcilie de façon idempotente.
 *
 * Coût : ~1 requête SQL + 1 search_read Odoo + N insertions (souvent 0).
 */
let isRunning = false

export default async function syncPricesFromOdooJob(container: MedusaContainer) {
  if (isRunning) {
    console.log("⏭️  [PRICE SYNC] Skip: run précédent encore en cours")
    return
  }

  if (!process.env.ODOO_URL || !process.env.ODOO_DB_NAME) return

  let odooService: OdooModuleService
  try {
    odooService = container.resolve(ODOO_MODULE)
  } catch {
    return
  }

  const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

  isRunning = true
  const startedAt = Date.now()

  try {
    // 1) Trouver les variantes sans price_set
    const variants = await pgConnection
      .raw(
        `
        SELECT pv.id AS variant_id, pv.sku
        FROM product p
        JOIN product_variant pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
        LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id AND pvps.deleted_at IS NULL
        WHERE p.deleted_at IS NULL
          AND p.metadata->>'external_id' IS NOT NULL
          AND pv.sku IS NOT NULL
          AND pv.sku != ''
          AND pvps.id IS NULL
        LIMIT 500
        `
      )
      .then((r: any) => r.rows || r)

    if (!variants.length) {
      // Cas nominal : pas de log pour ne pas polluer Railway
      return
    }

    console.log(`💰 [PRICE SYNC] ${variants.length} variantes sans price_set détectées`)

    // 2) Récupérer les prix Odoo en batch
    const skus: string[] = variants.map((v: any) => v.sku)
    let odooRows: any[] = []
    try {
      odooRows = await (odooService as any).client.request("call", {
        service: "object",
        method: "execute_kw",
        args: [
          (odooService as any).options.dbName,
          (odooService as any).uid || (await ensureLogin(odooService)),
          (odooService as any).options.apiKey,
          "product.product",
          "search_read",
          [[["default_code", "in", skus]]],
          { fields: ["default_code", "list_price", "lst_price", "currency_id"], context: { active_test: false } },
        ],
      })
    } catch (e: any) {
      console.error(`❌ [PRICE SYNC] Lecture Odoo échouée: ${e?.message || e}`)
      return
    }

    const odooBySku = new Map<string, { amount: number; currency: string }>()
    for (const r of odooRows) {
      const raw = r.lst_price != null && r.lst_price > 0 ? r.lst_price : r.list_price
      const amount = Math.round(Number(raw) * 100) / 100
      if (!Number.isFinite(amount) || amount <= 0) continue
      const currency = (Array.isArray(r.currency_id) ? r.currency_id[1] : "eur")?.toLowerCase() || "eur"
      odooBySku.set(String(r.default_code), { amount, currency })
    }

    // 3) Créer les price_sets manquants
    let fixed = 0
    for (const v of variants) {
      const odooPrice = odooBySku.get(v.sku)
      if (!odooPrice) continue

      const priceSetId = `pset_${randomId()}`
      const priceId = `price_${randomId()}`
      const pvpsId = `pvps_${randomId()}`

      try {
        await pgConnection.raw("BEGIN")
        await pgConnection.raw(
          `INSERT INTO price_set (id, created_at, updated_at) VALUES (?, NOW(), NOW())`,
          [priceSetId]
        )
        await pgConnection.raw(
          `INSERT INTO product_variant_price_set (id, variant_id, price_set_id, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())`,
          [pvpsId, v.variant_id, priceSetId]
        )
        await pgConnection.raw(
          `INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, rules_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?::jsonb, 0, NOW(), NOW())`,
          [
            priceId,
            priceSetId,
            odooPrice.currency,
            odooPrice.amount,
            JSON.stringify({ value: String(odooPrice.amount), precision: 20 }),
          ]
        )
        await pgConnection.raw("COMMIT")
        fixed++
      } catch (e: any) {
        await pgConnection.raw("ROLLBACK").catch(() => {})
        console.error(`❌ [PRICE SYNC] ${v.sku}: ${e?.message || e}`)
      }
    }

    const durationSec = Math.round((Date.now() - startedAt) / 1000)
    console.log(
      `✅ [PRICE SYNC] ${fixed} price_sets créés en ${durationSec}s ` +
        `(${variants.length} détectés, ${variants.length - odooBySku.size} sans prix Odoo)`
    )

    // 4) Invalider le cache storefront si des prix ont été créés
    if (fixed > 0) {
      const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.STOREFRONT_URL
      const secret = process.env.REVALIDATE_SECRET
      if (storefrontUrl && secret) {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 10_000)
          await fetch(`${storefrontUrl}/api/revalidate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret, tags: ["products"] }),
            signal: controller.signal,
          }).finally(() => clearTimeout(timer))
          console.log(`🔄 [PRICE SYNC] Cache storefront invalidé`)
        } catch (e: any) {
          console.warn(`⚠️  [PRICE SYNC] Revalidate échoué: ${e?.message || e}`)
        }
      }
    }
  } catch (error: any) {
    console.error("❌ [PRICE SYNC] Erreur globale:", error?.message || error)
  } finally {
    isRunning = false
  }
}

async function ensureLogin(svc: any): Promise<number> {
  if (!svc.uid) await svc.login()
  return svc.uid
}

function randomId(): string {
  const chars = "0123456789abcdefghjkmnpqrstvwxyz"
  let s = ""
  for (let i = 0; i < 26; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export const config = {
  name: "odoo-price-sync-hourly",
  schedule: "0 * * * *", // toutes les heures pile
}
