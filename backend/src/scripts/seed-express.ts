/**
 * Script d'ajout de l'option de livraison Express Bpost (12,90 €)
 *
 * Ce script ajoute une option "Livraison express" aux zones Belgique et Europe
 * existantes, sans toucher aux options déjà en place.
 *
 * Usage : npx medusa exec src/scripts/seed-express.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"

const EXPRESS_PRICE = 12.9 // 12,90 €

export default async function seedExpressShipping({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  logger.info("⚡ Ajout de l'option de livraison Express...")

  // ── 1. Trouver le provider Bpost ─────────────────────────────────
  const providers = await fulfillmentModuleService.listFulfillmentProviders()
  const bpostProvider = providers.find((p: any) => p.id.includes("bpost"))

  if (!bpostProvider) {
    logger.error(
      "❌ Provider Bpost introuvable. Providers disponibles : " +
        providers.map((p: any) => p.id).join(", ")
    )
    return
  }
  logger.info(`✅ Provider Bpost : ${bpostProvider.id}`)

  // ── 2. Trouver le shipping profile par défaut ────────────────────
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  const shippingProfile = shippingProfiles[0]

  if (!shippingProfile) {
    logger.error("❌ Aucun shipping profile par défaut trouvé. Lancez d'abord seed-bpost.ts")
    return
  }

  // ── 3. Vérifier qu'une option Express n'existe pas déjà ─────────
  const allOptions = await fulfillmentModuleService.listShippingOptions({})
  const existingExpress = allOptions.find(
    (opt: any) =>
      (opt.name?.toLowerCase().includes("express") &&
        (opt.provider_id === bpostProvider.id ||
          opt.provider_id?.includes("bpost"))) ||
      (opt as any).data?.mode === "express"
  )

  if (existingExpress) {
    logger.info(
      `ℹ️  Une option Express existe déjà : "${existingExpress.name}" (${existingExpress.id})`
    )
    logger.info("   Supprimez-la d'abord via l'admin Medusa si vous souhaitez la recréer.")
    return
  }

  // ── 4. Trouver les zones de service ──────────────────────────────
  const allServiceZones = await fulfillmentModuleService.listServiceZones({})

  const belgiumZone = allServiceZones.find(
    (z: any) =>
      z.name?.toLowerCase().includes("belg") ||
      z.geo_zones?.some(
        (g: any) => g.country_code?.toLowerCase() === "be"
      )
  )

  const europeZone = allServiceZones.find(
    (z: any) =>
      z.name?.toLowerCase().includes("europe") ||
      z.name?.toLowerCase().includes("international") ||
      z.geo_zones?.some((g: any) =>
        ["fr", "nl", "de", "lu"].includes(g.country_code?.toLowerCase())
      )
  )

  if (!belgiumZone) {
    logger.error("❌ Aucune zone Belgique trouvée. Lancez d'abord seed-bpost.ts")
    return
  }

  // ── 5. Construire les options Express ────────────────────────────
  const shippingOptions: any[] = []

  // Express Belgique
  shippingOptions.push({
    name: "Bpost - Livraison express (Belgique)",
    price_type: "flat",
    provider_id: bpostProvider.id,
    service_zone_id: belgiumZone.id,
    shipping_profile_id: shippingProfile.id,
    type: {
      label: "Bpost Express BE",
      description: "Livraison express en Belgique via Bpost (24 h ouvrées)",
      code: "bpost-express-be",
    },
    data: {
      id: "bpost-express-be",
      mode: "express",
    },
    prices: [{ currency_code: "eur", amount: EXPRESS_PRICE }],
    rules: [
      { attribute: "enabled_in_store", value: "true", operator: "eq" },
      { attribute: "is_return", value: "false", operator: "eq" },
    ],
  })

  // Express Europe (si la zone existe)
  if (europeZone) {
    shippingOptions.push({
      name: "Bpost - Livraison express (Europe)",
      price_type: "flat",
      provider_id: bpostProvider.id,
      service_zone_id: europeZone.id,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: "Bpost Express EU",
        description:
          "Livraison express internationale via Bpost (48-72 h ouvrées)",
        code: "bpost-express-eu",
      },
      data: {
        id: "bpost-express-eu",
        mode: "express",
      },
      prices: [{ currency_code: "eur", amount: EXPRESS_PRICE }],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" },
        { attribute: "is_return", value: "false", operator: "eq" },
      ],
    })
  }

  // ── 6. Créer les options ─────────────────────────────────────────
  logger.info(
    `📝 Création de ${shippingOptions.length} option(s) Express...`
  )

  try {
    await createShippingOptionsWorkflow(container).run({
      input: shippingOptions,
    })
    logger.info("✅ Option(s) Express créée(s) avec succès !")
  } catch (e: any) {
    logger.error("❌ Erreur lors de la création :", e.message)
    throw e
  }

  // ── 7. Résumé ────────────────────────────────────────────────────
  logger.info("")
  logger.info("🎉 Résumé :")
  for (const opt of shippingOptions) {
    logger.info(`  ⚡ ${opt.name} — ${EXPRESS_PRICE} €`)
  }
  logger.info("")
}
