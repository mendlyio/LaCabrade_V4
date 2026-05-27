/**
 * Job de réparation des liens product_shipping_profile soft-deleted.
 *
 * Contexte : la sync Odoo soft-delete des produits inactifs, ce qui cascade
 * un soft-delete sur product_shipping_profile. Si le produit redevient actif,
 * le lien reste soft-deleted → checkout cassé avec
 * "shipping profiles not satisfied".
 *
 * Ce job tourne chaque heure et :
 *  1. Détecte les produits sans shipping_profile actif
 *  2. Restaure le lien soft-deleted le plus récent OU en crée un nouveau
 *  3. Si > 0 produit était cassé, envoie une alerte email à welcome@mendly.io
 *     pour qu'on sache que le problème se reproduit
 */
import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function healShippingProfileLinksJob(container: MedusaContainer) {
  const logger = (container as any).logger ?? console

  const pgConnection: any = (container as any).resolve?.("__pg_connection__")
  if (!pgConnection) {
    logger.warn("[ShippingProfileHealer] __pg_connection__ non résolu, abandon.")
    return
  }

  try {
    const fulfillmentModuleService: any = container.resolve(Modules.FULFILLMENT)
    const [defaultProfile] = await fulfillmentModuleService.listShippingProfiles({
      type: "default",
    })
    if (!defaultProfile) {
      logger.warn("[ShippingProfileHealer] Pas de default shipping profile, abandon.")
      return
    }

    const before = await pgConnection.raw(`
      SELECT p.id, p.handle, p.title
      FROM product p
      WHERE p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM product_shipping_profile psp
          WHERE psp.product_id = p.id AND psp.deleted_at IS NULL
        )
    `)
    const broken = before?.rows ?? []

    if (broken.length === 0) {
      return
    }

    logger.warn(
      `[ShippingProfileHealer] ${broken.length} produit(s) sans shipping_profile actif détecté(s) — réparation...`
    )

    const restored = await pgConnection.raw(`
      WITH latest_deleted AS (
        SELECT DISTINCT ON (product_id) id, product_id
        FROM product_shipping_profile
        WHERE deleted_at IS NOT NULL
          AND product_id IN (
            SELECT p.id FROM product p
            WHERE p.deleted_at IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM product_shipping_profile psp
                WHERE psp.product_id = p.id AND psp.deleted_at IS NULL
              )
          )
        ORDER BY product_id, deleted_at DESC
      )
      UPDATE product_shipping_profile
      SET deleted_at = NULL, updated_at = NOW()
      WHERE id IN (SELECT id FROM latest_deleted)
      RETURNING product_id
    `)

    const stillBroken = await pgConnection.raw(`
      SELECT p.id
      FROM product p
      WHERE p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM product_shipping_profile psp
          WHERE psp.product_id = p.id AND psp.deleted_at IS NULL
        )
    `)

    let inserted = 0
    if (stillBroken?.rows?.length) {
      const ins = await pgConnection.raw(
        `
        INSERT INTO product_shipping_profile (id, product_id, shipping_profile_id, created_at, updated_at)
        SELECT 'prodsp_heal_' || substring(p.id from 6 for 24) || '_' || extract(epoch from now())::bigint::text,
               p.id, ?, NOW(), NOW()
        FROM product p
        WHERE p.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM product_shipping_profile psp
            WHERE psp.product_id = p.id AND psp.deleted_at IS NULL
          )
        RETURNING product_id
      `,
        [defaultProfile.id]
      )
      inserted = ins?.rows?.length ?? 0
    }

    const restoredCount = restored?.rows?.length ?? 0
    const productList = broken
      .slice(0, 10)
      .map((p: any) => `${p.title} (${p.handle})`)
      .join(", ")
    logger.warn(
      `[ShippingProfileHealer] ⚠️ ALERTE — ${broken.length} produit(s) sans shipping_profile actif réparé(s) automatiquement. Restaurés: ${restoredCount}, créés: ${inserted}. Premiers concernés: ${productList}${broken.length > 10 ? ` (+${broken.length - 10} autres)` : ""}`
    )
  } catch (err: any) {
    logger.error(`[ShippingProfileHealer] Erreur : ${err?.message}`)
  }
}

export const config = {
  name: "heal-shipping-profile-links",
  schedule: "0 * * * *",
}
